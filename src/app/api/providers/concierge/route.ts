import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  DEFAULT_OFFERS,
  JOURNEY_STAGES,
  nextStage,
  stageMessage,
  type JourneyStageId,
} from "@/lib/sila-journey";
import {
  evolutionConfigured,
  formatWhatsAppStageMessage,
  getConnectionState,
  sendText,
} from "@/lib/evolution";

const DEMO_PHONE = process.env.SILA_DEMO_WHATSAPP || "962796917829";

async function maybeSendWhatsApp(
  phone: string | null | undefined,
  guestName: string,
  stage: JourneyStageId,
  ar: boolean
) {
  if (!evolutionConfigured() || !phone) return { skipped: true as const };
  const conn = await getConnectionState();
  if (conn.state !== "open") return { skipped: true as const, state: conn.state };
  const msg = stageMessage(stage, guestName, ar);
  const text = formatWhatsAppStageMessage(msg.body, msg.choices);
  const sent = await sendText(phone, text);
  return { skipped: false as const, sent };
}

async function ensureConciergeSeed(providerId: string) {
  const offerCount = await db.conciergeOffer.count({ where: { providerId } });
  if (offerCount === 0) {
    await db.conciergeOffer.createMany({
      data: DEFAULT_OFFERS.map((o) => ({
        providerId,
        stage: o.stage,
        title: o.title,
        titleAr: o.titleAr,
        description: o.description,
        priceFrom: o.priceFrom,
        emoji: o.emoji,
        active: true,
      })),
    });
  }

  const stayCount = await db.conciergeStay.count({ where: { providerId } });
  if (stayCount === 0) {
    const now = new Date();
    const checkIn = new Date(now);
    checkIn.setDate(now.getDate() + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 3);

    const stay = await db.conciergeStay.create({
      data: {
        providerId,
        guestName: "ليان أحمد",
        guestPhone: DEMO_PHONE,
        roomName: "Desert View King Room",
        checkIn,
        checkOut,
        stage: "PRE_ARRIVAL",
        language: "ar",
        discountCode: "SILA-BACK10",
      },
    });

    const msg = stageMessage("PRE_ARRIVAL", stay.guestName, true);
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: "PRE_ARRIVAL",
        body: msg.body,
        choices: msg.choices,
      },
    });
  } else {
    // Only keep the seeded demo guest on the connected demo number
    await db.conciergeStay.updateMany({
      where: {
        providerId,
        guestName: "ليان أحمد",
        stage: { not: "DONE" },
      },
      data: { guestPhone: DEMO_PHONE },
    });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ stays: [], offers: [], stages: JOURNEY_STAGES });
  }

  await ensureConciergeSeed(profile.id);

  const [stays, offers] = await Promise.all([
    db.conciergeStay.findMany({
      where: { providerId: profile.id },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 40 },
        requests: { orderBy: { createdAt: "desc" }, take: 20 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.conciergeOffer.findMany({
      where: { providerId: profile.id, active: true },
      orderBy: { stage: "asc" },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const phones = stays.map((s) => s.guestPhone).filter(Boolean) as string[];
  const waGuests = phones.length
    ? await db.whatsAppGuest.findMany({ where: { phone: { in: phones } } })
    : [];
  const byPhone = Object.fromEntries(waGuests.map((g) => [g.phone, g]));

  return NextResponse.json({
    brand: { name: "SILA", tagline: "The smarter way to stay" },
    stages: JOURNEY_STAGES,
    offers,
    stays: stays.map((s) => {
      const g = s.guestPhone ? byPhone[s.guestPhone] : null;
      const digits = (s.guestPhone || "").replace(/\D/g, "");
      return {
        ...s,
        guestPhone: s.guestPhone,
        guestPhoneMasked: digits.length >= 4 ? `••••${digits.slice(-4)}` : "••••",
        guestUrl: `${appUrl}/stay/${s.token}`,
        guestIntel: g
          ? {
              travelerType: g.travelerType,
              interests: (g.interests || []).slice(0, 3),
              lastDestination: g.lastDestination,
            }
          : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "Create hotel profile first" }, { status: 400 });
  }

  await ensureConciergeSeed(profile.id);
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "advance_stage") {
    const stayId = String(body.stayId || "");
    const stay = await db.conciergeStay.findFirst({
      where: { id: stayId, providerId: profile.id },
    });
    if (!stay) return NextResponse.json({ error: "Stay not found" }, { status: 404 });

    const nxt = nextStage(stay.stage as JourneyStageId);
    if (nxt === "DONE") {
      const updated = await db.conciergeStay.update({
        where: { id: stay.id },
        data: { stage: "DONE" },
      });
      return NextResponse.json({ stay: updated });
    }

    const ar = stay.language !== "en";
    const msg = stageMessage(nxt, stay.guestName, ar);
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: nxt,
        body: msg.body,
        choices: msg.choices,
      },
    });
    const updated = await db.conciergeStay.update({
      where: { id: stay.id },
      data: { stage: nxt },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        requests: true,
      },
    });
    const wa = await maybeSendWhatsApp(stay.guestPhone, stay.guestName, nxt, ar);
    return NextResponse.json({ stay: updated, whatsapp: wa });
  }

  if (action === "resend_stage") {
    const stayId = String(body.stayId || "");
    const stay = await db.conciergeStay.findFirst({
      where: { id: stayId, providerId: profile.id },
    });
    if (!stay) return NextResponse.json({ error: "Stay not found" }, { status: 404 });
    const stage = (body.stage || stay.stage) as JourneyStageId;
    const ar = stay.language !== "en";
    const msg = stageMessage(stage, stay.guestName, ar);
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage,
        body: msg.body,
        choices: msg.choices,
      },
    });
    const updated = await db.conciergeStay.update({
      where: { id: stay.id },
      data: { stage },
      include: { messages: { orderBy: { createdAt: "asc" } }, requests: true },
    });
    return NextResponse.json({ stay: updated });
  }

  if (action === "create_stay") {
    const guestName = String(body.guestName || "Guest");
    const roomName = String(body.roomName || "Standard Room");
    const language = body.language === "en" ? "en" : "ar";
    const checkIn = new Date(body.checkIn || Date.now() + 86400000);
    const checkOut = new Date(body.checkOut || Date.now() + 86400000 * 4);
    const stay = await db.conciergeStay.create({
      data: {
        providerId: profile.id,
        guestName,
        guestPhone: body.guestPhone || DEMO_PHONE,
        roomName,
        checkIn,
        checkOut,
        stage: "PRE_ARRIVAL",
        language,
        discountCode: "SILA-BACK10",
        source: "DEMO",
        tripLabel: "Hotel-created demo stay",
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
    const wa = await maybeSendWhatsApp(
      stay.guestPhone,
      guestName,
      "PRE_ARRIVAL",
      language === "ar"
    );
    // If auto-send skipped, still try once more when WA is open
    let forced = wa;
    if (wa.skipped && evolutionConfigured()) {
      const conn = await getConnectionState();
      if (conn.state === "open") {
        forced = await maybeSendWhatsApp(stay.guestPhone, guestName, "PRE_ARRIVAL", language === "ar");
      }
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      stay,
      guestUrl: `${appUrl}/stay/${stay.token}`,
      whatsapp: forced,
      nextSteps: [
        "Guest receives WhatsApp with options 1/2/3",
        "Guest replies 2",
        "Request appears here → Confirm",
        "Click Next stage for check-in offers",
      ],
    });
  }

  if (action === "confirm_request") {
    const id = String(body.requestId || "");
    const reqRow = await db.conciergeRequest.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });
    return NextResponse.json({ request: reqRow });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
