import { db } from "@/lib/db";
import { trackEvent } from "@/lib/intent";
import {
  evolutionConfigured,
  formatWhatsAppStageMessage,
  getConnectionState,
  sendImage,
  sendLocation,
  sendText,
} from "@/lib/evolution";
import { stageMessage } from "@/lib/sila-journey";
import { inferDestination, listingFitsDestination } from "@/lib/destinations";
import { ensureJordanPartnerHotels } from "@/lib/ensure-jordan-hotels";

const DEMO_PHONE = process.env.SILA_DEMO_WHATSAPP || "962796917829";

export function looksLikeBooking(text: string) {
  return /احجز|حجز|confirm stay|book (it|this|the hotel)|reserve|i'?ll take it|confirmed|reserve hotel/i.test(
    text
  );
}

export async function fulfillBooking(input: {
  guestName: string;
  guestPhone?: string | null;
  destination?: string | null;
  listingId?: string | null;
  travelerUserId?: string | null;
  tripId?: string | null;
  language?: "ar" | "en";
  source?: string;
}) {
  const language = input.language === "en" ? "en" : "ar";
  const guestPhone =
    (input.guestPhone || "").replace(/\D/g, "") || DEMO_PHONE;
  await ensureJordanPartnerHotels();
  const dest = inferDestination(input.destination || "", input.destination);

  let listing = input.listingId
    ? await db.providerListing.findFirst({
        where: { id: input.listingId, status: "ACTIVE" },
        include: { provider: true },
      })
    : null;

  if (listing && dest && !listingFitsDestination(listing, dest)) {
    listing = null;
  }

  if (!listing) {
    const hotels = await db.providerListing.findMany({
      where: {
        status: "ACTIVE",
        category: "HOTEL",
        provider: { status: "APPROVED" },
      },
      include: { provider: true },
    });
    listing =
      (dest ? hotels.find((h) => listingFitsDestination(h, dest)) : null) || null;
  }

  if (!listing) {
    return { ok: false as const, error: "No partner hotel in this destination." };
  }

  const now = new Date();
  const checkIn = new Date(now);
  checkIn.setDate(now.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);

  const stay = await db.conciergeStay.create({
    data: {
      providerId: listing.providerId,
      guestName: input.guestName,
      guestPhone,
      roomName: listing.title,
      checkIn,
      checkOut,
      stage: "PRE_ARRIVAL",
      language,
      discountCode: "SILA-BACK10",
      source: input.source || "VOYARA_BOOKING",
      listingId: listing.id,
      travelerUserId: input.travelerUserId || null,
      tripLabel: dest ? `Voyara trip · ${dest}` : `Voyara trip · ${listing.city}`,
    },
  });

  if (input.tripId) {
    await db.trip
      .update({
        where: { id: input.tripId },
        data: { bookedAt: now, guestPhone, status: "ACTIVE" },
      })
      .catch(() => undefined);
  }

  const waGuest = await db.whatsAppGuest.findUnique({ where: { phone: guestPhone } });
  const careHint =
    waGuest?.careNeeds?.length || waGuest?.companions
      ? language === "ar"
        ? `\nرتبنا لكم إقامة هادية${waGuest.companions ? ` مع ${waGuest.companions}` : ""} — سبا قريب وبدون مشي طويل.`
        : `\nWe kept the stay easy${waGuest.companions ? ` for you and ${waGuest.companions}` : ""} — spa close, no long walks.`
      : "";

  const msg = stageMessage("PRE_ARRIVAL", input.guestName, language === "ar");
  msg.body = `${msg.body}${careHint}`;
  await db.conciergeMessage.create({
    data: {
      stayId: stay.id,
      role: "hotel",
      stage: "PRE_ARRIVAL",
      body: msg.body,
      choices: msg.choices,
    },
  });

  await trackEvent(
    "stay_booked",
    {
      stayId: stay.id,
      listingId: listing.id,
      providerId: listing.providerId,
      hotel: listing.provider.businessName,
      room: listing.title,
      city: listing.city,
      guestName: input.guestName,
      guestPhone,
      channel: input.source || "VOYARA_BOOKING",
      destination: dest || listing.city,
    },
    input.travelerUserId
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const mapsQ = encodeURIComponent(`${listing.title}, ${listing.city}`);
  const mapsUrl = `https://maps.google.com/?q=${mapsQ}`;
  const photo = `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80`;

  let whatsapp: { sent: boolean; error?: string | null } = { sent: false };
  if (evolutionConfigured()) {
    const conn = await getConnectionState();
    if (conn.state === "open") {
      const header =
        language === "ar"
          ? `تم تأكيد إقامتك ✅\n${listing.provider.businessName}\n${listing.title} · ${listing.city}\n\nالخريطة: ${mapsUrl}\nشات الويب: ${appUrl}/stay/${stay.token}`
          : `Stay confirmed ✅\n${listing.provider.businessName}\n${listing.title} · ${listing.city}\n\nMap: ${mapsUrl}\nGuest chat: ${appUrl}/stay/${stay.token}`;
      await sendImage(guestPhone, photo, header);
      if (listing.lat != null && listing.lng != null) {
        await sendLocation(
          guestPhone,
          listing.lat,
          listing.lng,
          listing.title,
          `${listing.city}, ${listing.country}`
        );
      }
      const stage = formatWhatsAppStageMessage(msg.body, msg.choices);
      const sent = await sendText(guestPhone, stage, 1200);
      whatsapp = { sent: sent.ok, error: sent.error };
    } else {
      whatsapp = { sent: false, error: `WhatsApp state: ${conn.state}` };
    }
  }

  return {
    ok: true as const,
    stay,
    listing,
    hotelName: listing.provider.businessName,
    guestUrl: `${appUrl}/stay/${stay.token}`,
    mapsUrl,
    whatsapp,
  };
}
