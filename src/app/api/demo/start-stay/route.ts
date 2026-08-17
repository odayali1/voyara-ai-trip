import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { fulfillBooking } from "@/lib/fulfill-booking";
import { detectReplyLanguage } from "@/lib/language";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json().catch(() => ({}));
  const listingId = body.listingId ? String(body.listingId) : null;
  const language = body.language === "en" ? "en" : detectReplyLanguage(String(body.note || "")) === "en" ? "en" : "ar";

  const booked = await fulfillBooking({
    guestName:
      String(body.guestName || "").trim() ||
      session?.user.name ||
      "Voyara Traveler",
    guestPhone: body.guestPhone || null,
    destination: body.destination || null,
    listingId,
    travelerUserId: session?.user.id || null,
    tripId: body.tripId || null,
    language,
    source: "VOYARA_BOOKING",
  });

  if (!booked.ok) {
    return NextResponse.json({ error: booked.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    story: {
      traveler: "You confirmed a stay from Voyara.",
      hotel: `${booked.hotelName} now sees this guest in SILA Journey.`,
      guest: booked.whatsapp.sent
        ? "WhatsApp sent with map + hotel stage 1."
        : "Open the guest web chat if WhatsApp did not send.",
    },
    stay: {
      id: booked.stay.id,
      guestName: booked.stay.guestName,
      roomName: booked.stay.roomName,
      hotelName: booked.hotelName,
      stage: booked.stay.stage,
      source: booked.stay.source,
    },
    guestUrl: booked.guestUrl,
    mapsUrl: booked.mapsUrl,
    providerHint:
      "Login as Provider → SILA Journey → this guest (from Voyara) → Confirm / Next stage",
    whatsapp: booked.whatsapp,
  });
}
