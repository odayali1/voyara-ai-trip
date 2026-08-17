import { generateText } from "ai";
import { db } from "@/lib/db";
import {
  deepseek,
  deepseekModel,
  buildWhatsAppHermesPrompt,
  buildItineraryJsonPrompt,
  buildProfileExtractPrompt,
} from "@/lib/ai";
import { parseItineraryFromText, extractJsonObject } from "@/lib/parse-itinerary";
import { detectReplyLanguage } from "@/lib/language";
import type { ItineraryPlan } from "@/lib/itinerary-schema";
import { sendImage, sendLocation, sendText } from "@/lib/evolution";
import { trackEvent } from "@/lib/intent";
import { fulfillBooking, looksLikeBooking } from "@/lib/fulfill-booking";
import {
  geocodeInDestination,
  inferDestination,
  listingFitsDestination,
  lookupKnownPlace,
} from "@/lib/destinations";
import { ensureJordanPartnerHotels } from "@/lib/ensure-jordan-hotels";

function mapsLink(title: string, area: string, lat?: number | null, lng?: number | null) {
  if (lat != null && lng != null) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(`${title}, ${area}`)}`;
}

const DEST_PHOTOS: Record<string, string> = {
  jordan: "https://images.unsplash.com/photo-1548788140-5c6960c2881b?auto=format&fit=crop&w=1200&q=80",
  petra: "https://images.unsplash.com/photo-1579606032794-1d16147812c3?auto=format&fit=crop&w=1200&q=80",
  amman: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=80",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
  lisbon: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
};

function destinationPhoto(dest: string) {
  const key = dest.toLowerCase();
  for (const [k, url] of Object.entries(DEST_PHOTOS)) {
    if (key.includes(k)) return url;
  }
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
}

async function ensureWhatsAppUser(phone: string, name?: string | null) {
  const email = `wa-${phone}@voyara.whatsapp`;
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: name || `WhatsApp ${phone.slice(-4)}`,
        emailVerified: true,
        role: "TRAVELER",
        travelerProfile: {
          create: { onboarded: true },
        },
      },
    });
  } else if (name && user.name.startsWith("WhatsApp ")) {
    user = await db.user.update({
      where: { id: user.id },
      data: { name },
    });
  }
  return user;
}

async function findOrCreateGuest(phone: string) {
  const existing =
    (await db.whatsAppGuest.findUnique({ where: { phone } })) ||
    (await db.whatsAppGuest.findFirst({
      where: { phone: { endsWith: phone.slice(-9) } },
    }));
  if (existing) {
    return db.whatsAppGuest.update({
      where: { id: existing.id },
      data: {
        phone,
        lastSeenAt: new Date(),
        messageCount: { increment: 1 },
      },
    });
  }
  const user = await ensureWhatsAppUser(phone);
  return db.whatsAppGuest.create({
    data: {
      phone,
      userId: user.id,
      displayName: null,
      language: "ar",
      messageCount: 1,
    },
  });
}

async function findOrCreateTrip(phone: string, ownerId: string) {
  const existing = await db.trip.findFirst({
    where: { guestPhone: phone, channel: "WHATSAPP", bookedAt: null },
    orderBy: { updatedAt: "desc" },
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
  });
}

async function enrichStops(plan: ItineraryPlan): Promise<ItineraryPlan> {
  const days = [];
  for (const day of plan.days) {
    const stops = [];
    for (const stop of day.stops) {
      const geo =
        lookupKnownPlace(stop.title, plan.destination) ||
        (await geocodeInDestination(stop.title, plan.destination));
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
    ? `✦ Voyara · برنامجك\n${plan.title}\n${plan.destination}`
    : `✦ Voyara itinerary\n${plan.title}\n${plan.destination}`;
  const days = plan.days
    .slice(0, 5)
    .map((d) => {
      const stops = d.stops
        .slice(0, 5)
        .map((s) => {
          const pin = mapsLink(s.title, plan.destination, s.lat, s.lng);
          return `• ${s.time ? s.time + " · " : ""}${s.title}\n  ${pin}`;
        })
        .join("\n");
      return `Day ${d.dayNumber} — ${d.title || ""}\n${stops}`;
    })
    .join("\n\n");
  return `${head}\n\n${plan.summary}\n\n${days}`.slice(0, 3800);
}

function formatHotelsWhatsApp(
  listings: Array<{ id: string; title: string; city: string; country?: string; priceFrom: number | null; lat?: number | null; lng?: number | null }>,
  ar: boolean
) {
  if (!listings.length) return null;
  const lines = listings.map((h, i) => {
    const area = `${h.city}${h.country ? `, ${h.country}` : ""}`;
    const maps = mapsLink(h.title, area, h.lat, h.lng);
    const price = h.priceFrom != null ? ` · from $${h.priceFrom}` : "";
    return `${i + 1}) ${h.title} — ${h.city}${price}\n   ${maps}`;
  });
  const tail = ar
    ? `\nرد برقم الفندق أو اكتب احجز.`
    : `\nReply with the hotel number or BOOK.`;
  const title = ar ? "فنادق شركاء Voyara في وجهتك" : "Voyara partner hotels in this destination";
  return `${title}\n${lines.join("\n")}${tail}`;
}

type Extracted = {
  displayName?: string | null;
  travelerType?: string | null;
  budgetBand?: string | null;
  interests?: string[];
  companions?: string | null;
  homeCity?: string | null;
  lastDestination?: string | null;
  memorySummary?: string | null;
};

async function extractAndSaveProfile(
  guestId: string,
  userId: string | null,
  conversation: string
) {
  try {
    const { text } = await generateText({
      model: deepseek.chat(deepseekModel),
      prompt: buildProfileExtractPrompt(conversation),
    });
    const raw = extractJsonObject(text) as Extracted;
    const interests = Array.isArray(raw.interests)
      ? raw.interests.map(String).slice(0, 8)
      : [];
    await db.whatsAppGuest.update({
      where: { id: guestId },
      data: {
        displayName: raw.displayName || undefined,
        travelerType: raw.travelerType || undefined,
        budgetBand: raw.budgetBand || undefined,
        interests: interests.length ? interests : undefined,
        companions: raw.companions || undefined,
        homeCity: raw.homeCity || undefined,
        lastDestination: raw.lastDestination || undefined,
        memorySummary: raw.memorySummary || undefined,
      },
    });
    if (userId && raw.displayName) {
      await db.user.update({
        where: { id: userId },
        data: { name: raw.displayName },
      });
      await db.travelerProfile.updateMany({
        where: { userId },
        data: {
          travelerType:
            raw.travelerType === "SOLO" ||
            raw.travelerType === "COUPLE" ||
            raw.travelerType === "FAMILY" ||
            raw.travelerType === "FRIENDS"
              ? raw.travelerType
              : undefined,
          budgetBand:
            raw.budgetBand === "BUDGET" ||
            raw.budgetBand === "MID" ||
            raw.budgetBand === "LUXURY"
              ? raw.budgetBand
              : undefined,
          interests,
          homeCity: raw.homeCity || undefined,
          onboarded: true,
        },
      });
    }
    return raw;
  } catch (err) {
    console.error("profile extract failed", err);
    return null;
  }
}

export async function handleTravelerWhatsApp(phone: string, text: string) {
  await ensureJordanPartnerHotels();
  const guest = await findOrCreateGuest(phone);
  const isNew = guest.messageCount <= 1;
  const user = await ensureWhatsAppUser(phone, guest.displayName);

  const trip = await findOrCreateTrip(phone, user.id);
  await db.chatMessage.create({
    data: { tripId: trip.id, role: "user", content: text },
  });
  await trackEvent(
    "whatsapp_inbound",
    {
      phone,
      guestId: guest.id,
      preview: text.slice(0, 160),
      tripId: trip.id,
      isNew,
    },
    user.id
  );

  const detected = detectReplyLanguage(text);
  const lang =
    detected === "ar" || detected === "zh"
      ? detected
      : /[A-Za-z]{3,}/.test(text)
        ? "en"
        : guest.language === "en"
          ? "en"
          : "ar";
  const ar = lang === "ar";
  const destGuess = inferDestination(
    `${text} ${guest.lastDestination || ""} ${trip.destination}`,
    guest.lastDestination || trip.destination
  );

  if (isNew) {
    await sendText(
      phone,
      ar
        ? `أهلاً فيك في Voyara ✨\nأنا رفيق سفرك — زي صديق خبير بالأماكن.\nرقمّك صار ملفّك. احكيني وين نفسك تروح أو اطلب اقتراح.`
        : `Welcome to Voyara ✨\nI'm your travel friend — expert, not a call center.\nThis number is now your profile. Tell me where you want to go.`,
      200
    );
  }

  const pick = Number(text.trim());
  if (guest.lastOfferIds.length && pick >= 1 && pick <= guest.lastOfferIds.length) {
    const listingId = guest.lastOfferIds[pick - 1];
    const booked = await fulfillBooking({
      guestName: guest.displayName || user.name,
      guestPhone: phone,
      destination: destGuess || guest.lastDestination || trip.destination,
      listingId,
      travelerUserId: user.id,
      tripId: trip.id,
      language: ar ? "ar" : "en",
      source: "WHATSAPP",
    });
    if (booked.ok) {
      await db.whatsAppGuest.update({
        where: { id: guest.id },
        data: { lastOfferIds: [] },
      });
      return { ok: true, mode: "booked", stayId: booked.stay.id };
    }
  }

  if (looksLikeBooking(text) || /^book$/i.test(text.trim()) || text.trim() === "احجز") {
    const dest = destGuess || guest.lastDestination || trip.destination;
    const booked = await fulfillBooking({
      guestName: guest.displayName || user.name,
      guestPhone: phone,
      destination: dest,
      listingId: guest.lastOfferIds[0] || null,
      travelerUserId: user.id,
      tripId: trip.id,
      language: ar ? "ar" : "en",
      source: "WHATSAPP",
    });
    await db.whatsAppGuest.update({
      where: { id: guest.id },
      data: { lastOfferIds: [] },
    });
    if (!booked.ok) {
      await sendText(
        phone,
        ar
          ? "ما في فندق شريك جاهز لهذه الوجهة بعد — قلّي مدينة ثانية أو انتظر موافقة الأدمن."
          : "No partner hotel is live for that destination yet."
      );
      return { ok: false, reason: booked.error };
    }
    return { ok: true, mode: "booked", stayId: booked.stay.id };
  }

  const listings = await db.providerListing.findMany({
    where: { status: "ACTIVE", provider: { status: "APPROVED" } },
    take: 40,
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      country: true,
      description: true,
      priceFrom: true,
      lat: true,
      lng: true,
    },
  });
  const localListings = destGuess
    ? listings.filter((l) => listingFitsDestination(l, destGuess))
    : [];

  const history = await db.chatMessage.findMany({
    where: { tripId: trip.id },
    orderBy: { createdAt: "desc" },
    take: 16,
  });
  const convo = history
    .reverse()
    .map((m) => `${m.role === "user" ? "Traveler" : "Voyara"}: ${m.content}`)
    .join("\n");

  const listingsLine = (localListings.length ? localListings : [])
    .map((l) => `${l.title} (${l.category}) in ${l.city}, ${l.country}${l.priceFrom != null ? ` from $${l.priceFrom}` : ""}`)
    .join("; ");

  const system = buildWhatsAppHermesPrompt({
    name: guest.displayName,
    phone,
    travelerType: guest.travelerType,
    budgetBand: guest.budgetBand,
    interests: guest.interests,
    companions: guest.companions,
    homeCity: guest.homeCity,
    memory: guest.memorySummary,
    lastDestination: guest.lastDestination,
    lastTripTitle: guest.lastTripTitle,
    isNew,
    listingsLine,
    replyLanguage: lang,
  });

  const { text: reply } = await generateText({
    model: deepseek.chat(deepseekModel),
    system,
    prompt: convo || text,
  });

  await db.chatMessage.create({
    data: { tripId: trip.id, role: "assistant", content: reply.slice(0, 8000) },
  });

  void extractAndSaveProfile(guest.id, user.id, `${convo}\nVoyara: ${reply}`);

  const trivial = /^(احجز|book|\d+|ok|تمام|شكرا|thanks)?$/i.test(text.trim()) || text.trim().length < 8;
  const wantsPlan =
    !trivial &&
    /plan|trip|go to|visit|suggest|رحلة|روح|أروح|اقترح|برنامج|أيام|jordan|petra|amman|tokyo|دبي|عمان|البترا|الأردن|ماعين|بحر|حمامات/i.test(
      text
    );

  let plan: ItineraryPlan | null = null;
  if (wantsPlan) {
    try {
      const { text: jsonText } = await generateText({
        model: deepseek.chat(deepseekModel),
        prompt: buildItineraryJsonPrompt({
          userRequest: text,
          assistantReply: reply.slice(0, 5000),
          travelerType: guest.travelerType,
          budgetBand: guest.budgetBand,
          interests: guest.interests,
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
      await db.whatsAppGuest.update({
        where: { id: guest.id },
        data: {
          lastDestination: plan.destination,
          lastTripTitle: plan.title,
          language: ar ? "ar" : "en",
        },
      });
      await trackEvent(
        "trip_generated",
        {
          tripId: trip.id,
          destination: plan.destination,
          channel: "WHATSAPP",
          days: plan.days.length,
          guestId: guest.id,
        },
        user.id
      );
    } catch (err) {
      console.error("whatsapp itinerary failed", err);
    }
  }

  await sendText(phone, reply.replace(/[#*_`]/g, "").slice(0, 1200), 500);

  if (plan) {
    await sendImage(
      phone,
      destinationPhoto(plan.destination),
      `${plan.destination} · Voyara`
    );
    await sendText(phone, formatItineraryWhatsApp(plan, ar), 800);
    const pin = plan.days[0]?.stops.find((s) => s.lat != null && s.lng != null);
    if (pin?.lat != null && pin.lng != null) {
      await sendLocation(phone, pin.lat, pin.lng, pin.title, plan.destination);
    }
    const hotels = listings
      .filter((l) => l.category === "HOTEL")
      .filter((l) => listingFitsDestination(l, plan.destination || destGuess))
      .slice(0, 3);
    const hotelBlock = formatHotelsWhatsApp(hotels, ar);
    if (hotelBlock) {
      await db.whatsAppGuest.update({
        where: { id: guest.id },
        data: { lastOfferIds: hotels.map((h) => h.id) },
      });
      await sendText(phone, hotelBlock, 1100);
    } else {
      await sendText(
        phone,
        ar
          ? "ما في فندق شريك على Voyara بهالوجهة بعد. اكتب احجز إذا بدك نحجز أقرب إقامة بالأردن لما تتوفر، أو كمّل تخطيط الأماكن."
          : "No Voyara partner hotel is live in this destination yet. Ask for another city, or keep planning places.",
        1100
      );
    }
  }

  return { ok: true, mode: plan ? "planned" : "chat", tripId: trip.id, guestId: guest.id, isNew };
}
