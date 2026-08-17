import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  evolutionConfigured,
  formatWhatsAppStageMessage,
  getConnectionState,
  sendText,
} from "@/lib/evolution";
import { stageMessage } from "@/lib/sila-journey";

export const dynamic = "force-dynamic";

const DEMO_PHONE = process.env.SILA_DEMO_WHATSAPP || "962796917829";

/**
 * Traveler "Confirm stay" → creates a SILA ConciergeStay on the hotel side
 * and optionally sends the first WhatsApp stage to the demo guest phone.
 * This is the bridge between marketplace and hotel ops.
 */
export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json().catch(() => ({}));
  const listingId = body.listingId ? String(body.listingId) : null;

  let listing = listingId
    ? await db.providerListing.findFirst({
        where: { id: listingId, status: "ACTIVE", category: "HOTEL" },
        include: { provider: true },
      })
    : null;

  if (!listing) {
    listing = await db.providerListing.findFirst({
      where: {
        status: "ACTIVE",
        category: "HOTEL",
        provider: { status: "APPROVED" },
      },
      include: { provider: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (!listing) {
    return NextResponse.json(
      { error: "No hotel listing available. Provider must publish a hotel room first." },
      { status: 400 }
    );
  }

  const guestName =
    String(body.guestName || "").trim() ||
    session?.user.name ||
    "Voyara Traveler";
  const guestPhone = String(body.guestPhone || DEMO_PHONE).replace(/\D/g, "") || DEMO_PHONE;
  const language = body.language === "en" ? "en" : "ar";

  const now = new Date();
  const checkIn = new Date(now);
  checkIn.setDate(now.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);

  const stay = await db.conciergeStay.create({
    data: {
      providerId: listing.providerId,
      guestName,
      guestPhone,
      roomName: listing.title,
      checkIn,
      checkOut,
      stage: "PRE_ARRIVAL",
      language,
      discountCode: "SILA-BACK10",
      source: "VOYARA_BOOKING",
      listingId: listing.id,
      travelerUserId: session?.user.id || null,
      tripLabel: `Voyara trip · ${listing.city}`,
    },
  });

  const msg = stageMessage("PRE_ARRIVAL", guestName, language === "ar");
  await db.conciergeMessage.create({
    data: {
      stayId: stay.id,
      role: "hotel",
      stage: "PRE_ARRIVAL",
      body: msg.body,
      choices: msg.choices,
    },
  });

  let whatsapp: { sent: boolean; error?: string | null } = { sent: false };
  if (evolutionConfigured()) {
    const conn = await getConnectionState();
    if (conn.state === "open") {
      const text = formatWhatsAppStageMessage(msg.body, msg.choices);
      const sent = await sendText(guestPhone, text);
      whatsapp = { sent: sent.ok, error: sent.error };
    } else {
      whatsapp = { sent: false, error: `WhatsApp state: ${conn.state}` };
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({
    ok: true,
    story: {
      traveler: "You confirmed a stay from the Voyara marketplace.",
      hotel: `${listing.provider.businessName} now sees this guest in SILA Journey.`,
      guest: whatsapp.sent
        ? `WhatsApp sent to ${guestPhone}. Reply 1, 2 or 3.`
        : "Open the guest web chat if WhatsApp did not send.",
    },
    stay: {
      id: stay.id,
      guestName: stay.guestName,
      roomName: stay.roomName,
      hotelName: listing.provider.businessName,
      stage: stay.stage,
      source: stay.source,
    },
    guestUrl: `${appUrl}/stay/${stay.token}`,
    providerHint: "Login as Provider → SILA Journey → select this guest → Confirm requests / Next stage",
    whatsapp,
  });
}
