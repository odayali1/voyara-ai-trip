import { generateText } from "ai";
import { db } from "@/lib/db";
import {
  deepseek,
  deepseekModel,
  buildPlannerSystemPrompt,
  buildItineraryJsonPrompt,
} from "@/lib/ai";
import { geocodePlace } from "@/lib/geo";
import { parseItineraryFromText } from "@/lib/parse-itinerary";
import { detectReplyLanguage } from "@/lib/language";
import type { ItineraryPlan } from "@/lib/itinerary-schema";
import { sendImage, sendLocation, sendText } from "@/lib/evolution";
import { trackEvent } from "@/lib/intent";
import { fulfillBooking, looksLikeBooking } from "@/lib/fulfill-booking";

function mapsLink(title: string, dest: string, lat?: number | null, lng?: number | null) {
  if (lat != null && lng != null) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(`${title}, ${dest}`)}`;
}

function destinationPhoto(dest: string) {
  const q = encodeURIComponent(dest.split(",")[0] || "travel");
  return `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80#${q}`;
}

async function ownerForWhatsApp() {
  return (
    (await db.user.findFirst({ where: { email: "traveler@voyara.app" } })) ||
    (await db.user.findFirst({ where: { role: "TRAVELER" } }))
  );
}

async function findOrCreateTrip(phone: string, ownerId: string) {
  const existing = await db.trip.findFirst({
    where: { guestPhone: phone, channel: "WHATSAPP" },
    orderBy: { updatedAt: "desc" },
    include: { days: { include: { stops: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) return existing;
  return db.trip.create({
    data: {
      ownerId,
      title: "WhatsApp trip",
      destination: "TBD",
      channel: "WHATSAPP",
      guestPhone: phone,
      status: "DRAFT",
    },
    include: { days: { include: { stops: true } }, messages: true },
  });
}

async function enrichStops(plan: ItineraryPlan): Promise<ItineraryPlan> {
  const destGeo = await geocodePlace(plan.destination);
  const days = [];
  for (const day of plan.days) {
    const stops = [];
    for (const stop of day.stops) {
      const geo =
        (await geocodePlace(`${stop.title}, ${plan.destination}`)) || destGeo;
      stops.push({
        ...stop,
        lat: geo?.lat,
        lng: geo?.lng,
        address: stop.address || geo?.displayName,
      });
    }
    days.push({ ...day, stops });
  }
  return { ...plan, days };
}

function formatItineraryWhatsApp(plan: ItineraryPlan, ar: boolean) {
  const head = ar
    ? `✦ Voyara · برنامجك جاهز\n${plan.title}\n${plan.destination}\n`
    : `✦ Voyara · Your itinerary\n${plan.title}\n${plan.destination}\n`;
  const days = plan.days
    .slice(0, 4)
    .map((d) => {
      const stops = d.stops
        .slice(0, 4)
        .map((s) => {
          const pin = mapsLink(s.title, plan.destination, s.lat, s.lng);
          return `  • ${s.time ? s.time + " " : ""}${s.title}\n    ${pin}`;
        })
        .join("\n");
      return `Day ${d.dayNumber} — ${d.title || ""}\n${stops}`;
    })
    .join("\n\n");
  const tail = ar
    ? `\nاكتب «احجز» لتأكيد الفندق مع الشريك — الفندق والإدارة يشوفون الحجز فوراً.`
    : `\nReply BOOK to confirm the partner hotel — hotel + admin dashboards update live.`;
  return `${head}\n${plan.summary}\n\n${days}${tail}`.slice(0, 3500);
}

export async function handleTravelerWhatsApp(phone: string, text: string) {
  const owner = await ownerForWhatsApp();
  if (!owner) {
    await sendText(phone, "Voyara is warming up — try again in a minute.");
    return { ok: false, reason: "no-owner" };
  }

  const trip = await findOrCreateTrip(phone, owner.id);
  await db.chatMessage.create({
    data: { tripId: trip.id, role: "user", content: text },
  });
  await trackEvent(
    "whatsapp_inbound",
    { phone, preview: text.slice(0, 160), tripId: trip.id },
    owner.id
  );

  const lang = detectReplyLanguage(text);
  const ar = lang === "ar";

  if (looksLikeBooking(text) || /^book$/i.test(text.trim()) || text.trim() === "احجز") {
    const booked = await fulfillBooking({
      guestName: owner.name || "WhatsApp guest",
      guestPhone: phone,
      destination: trip.destination !== "TBD" ? trip.destination : text,
      travelerUserId: owner.id,
      tripId: trip.id,
      language: ar ? "ar" : "en",
      source: "WHATSAPP",
    });
    if (!booked.ok) {
      await sendText(
        phone,
        ar
          ? "ما قدرنا نأكد فندق الشريك بعد — جرّب بعد ما يوافق الأدمن على الفندق."
          : "No partner hotel is live yet. Admin must approve a hotel first."
      );
      return { ok: false, reason: booked.error };
    }
    await db.chatMessage.create({
      data: {
        tripId: trip.id,
        role: "assistant",
        content: `Booked ${booked.hotelName} / ${booked.listing.title}`,
      },
    });
    return { ok: true, mode: "booked", stayId: booked.stay.id };
  }

  const listings = await db.providerListing.findMany({
    where: { status: "ACTIVE", provider: { status: "APPROVED" } },
    take: 12,
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      description: true,
      priceFrom: true,
    },
  });

  const history = await db.chatMessage.findMany({
    where: { tripId: trip.id },
    orderBy: { createdAt: "asc" },
    take: 12,
  });

  const system = buildPlannerSystemPrompt({
    providerListings: listings,
    replyLanguage: lang,
  });

  const { text: reply } = await generateText({
    model: deepseek.chat(deepseekModel),
    system,
    prompt: history
      .map((m) => `${m.role === "user" ? "Traveler" : "Voyara"}: ${m.content}`)
      .join("\n\n"),
  });

  await db.chatMessage.create({
    data: { tripId: trip.id, role: "assistant", content: reply.slice(0, 8000) },
  });

  let plan: ItineraryPlan | null = null;
  try {
    const listingsLine = listings.map((l) => `${l.title} in ${l.city}`).join("; ");
    const { text: jsonText } = await generateText({
      model: deepseek.chat(deepseekModel),
      prompt: buildItineraryJsonPrompt({
        userRequest: text,
        assistantReply: reply.slice(0, 5000),
        listingsLine,
        replyLanguage: lang,
      }),
    });
    plan = await enrichStops(parseItineraryFromText(jsonText));
    await db.trip.update({
      where: { id: trip.id },
      data: {
        title: plan.title,
        destination: plan.destination,
        summary: plan.summary,
        status: "ACTIVE",
      },
    });
    await db.itineraryDay.deleteMany({ where: { tripId: trip.id } });
    for (const day of plan.days) {
      await db.itineraryDay.create({
        data: {
          tripId: trip.id,
          dayNumber: day.dayNumber,
          title: day.title,
          notes: day.notes,
          stops: {
            create: day.stops.map((stop, order) => ({
              order,
              title: stop.title,
              time: stop.time,
              category: stop.category,
              address: stop.address,
              lat: stop.lat,
              lng: stop.lng,
              tips: stop.tips,
              estimatedCost: stop.estimatedCost,
              currency: stop.currency || "USD",
            })),
          },
        },
      });
    }
    await trackEvent(
      "trip_generated",
      { tripId: trip.id, destination: plan.destination, channel: "WHATSAPP", days: plan.days.length },
      owner.id
    );
  } catch (err) {
    console.error("whatsapp itinerary failed", err);
  }

  const chatSnippet = reply.replace(/[#*_`]/g, "").slice(0, 900);
  await sendText(phone, chatSnippet, 400);
  if (plan) {
    await sendImage(
      phone,
      destinationPhoto(plan.destination),
      ar ? `${plan.destination} · Voyara` : `${plan.destination} · Voyara`
    );
    await sendText(phone, formatItineraryWhatsApp(plan, ar), 900);
    const pin = plan.days[0]?.stops.find((s) => s.lat != null && s.lng != null);
    if (pin?.lat != null && pin.lng != null) {
      await sendLocation(phone, pin.lat, pin.lng, pin.title, plan.destination);
    }
  }

  return { ok: true, mode: "planned", tripId: trip.id };
}
