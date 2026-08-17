import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  extractInboundText,
  normalizeWhatsAppNumber,
  sendText,
} from "@/lib/evolution";

export const dynamic = "force-dynamic";

const DEMO_PHONE = process.env.SILA_DEMO_WHATSAPP || "962796917829";

async function findStayForNumber(number: string) {
  const stays = await db.conciergeStay.findMany({
    where: { stage: { not: "DONE" } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const exact = stays.find((s) => normalizeWhatsAppNumber(s.guestPhone) === number);
  if (exact) return exact;

  const fuzzy = stays.find((s) => {
    const p = normalizeWhatsAppNumber(s.guestPhone);
    if (!p) return false;
    return p.endsWith(number.slice(-9)) || number.endsWith(p.slice(-9));
  });
  if (fuzzy) return fuzzy;

  // Demo fallback: guest WhatsApp is the linked demo phone
  const demo = normalizeWhatsAppNumber(DEMO_PHONE);
  if (demo && (number === demo || number.endsWith(demo.slice(-9)) || demo.endsWith(number.slice(-9)))) {
    return stays[0] || null;
  }

  // Last resort for live demos: single active stay
  if (stays.length === 1) return stays[0];
  return null;
}

/**
 * Evolution API → Voyara inbound WhatsApp webhook.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = String(
    (payload as { event?: string; type?: string }).event ||
      (payload as { type?: string }).type ||
      ""
  ).toLowerCase();

  // Accept messages.upsert / MESSAGES_UPSERT / empty (some proxies strip event)
  const isMessageEvent =
    !event ||
    event.includes("messages.upsert") ||
    event.includes("messages_upsert") ||
    event.includes("messagesupsert");

  if (event && !isMessageEvent) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const { fromMe, number, text } = extractInboundText(payload);
  if (fromMe || !text) {
    return NextResponse.json({ ok: true, skipped: true, reason: fromMe ? "fromMe" : "no-text" });
  }

  const stay = number ? await findStayForNumber(number) : await findStayForNumber(DEMO_PHONE);
  if (!stay) {
    // Still acknowledge so guest isn't left hanging in demos
    const to = number || DEMO_PHONE;
    await sendText(
      to,
      "SILA هنا 👋 ابدأ الرحلة من لوحة الفندق (SILA Journey) ثم أعد إرسال رقم الخيار."
    );
    return NextResponse.json({ ok: true, unmatched: number });
  }

  const replyTo = number || normalizeWhatsAppNumber(stay.guestPhone) || DEMO_PHONE;

  await db.conciergeMessage.create({
    data: {
      stayId: stay.id,
      role: "guest",
      stage: stay.stage,
      body: text,
      choices: [],
    },
  });

  const skip =
    /لاحقا|تمام(?!\s)|مو الآن|لا شكرا|all set|maybe later|not now|no thanks|i'm all set|^تمام$/i.test(
      text
    );
  const ratingMatch = text.trim().match(/^[1-5]$/);

  let reply = "";

  if (stay.stage === "POST_STAY" && ratingMatch) {
    await db.conciergeStay.update({
      where: { id: stay.id },
      data: { rating: Number(text.trim()), stage: "DONE" },
    });
    reply =
      stay.language === "ar"
        ? `شكراً لتقييمك ${text.trim()}/5 💜 كود خصمك: ${stay.discountCode || "SILA-BACK10"}`
        : `Thanks for rating us ${text.trim()}/5 💜 Your code: ${stay.discountCode || "SILA-BACK10"}`;
  } else if (!skip) {
    const needHelp = /مساعدة|need help|help|بدي مساعدة/i.test(text);
    let title = text.trim();
    const recentHotel = await db.conciergeMessage.findMany({
      where: { stayId: stay.id, role: "hotel" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const hotelForChoices = recentHotel.find((m) => m.choices.length > 0);
    const n = Number(title);
    const choices = hotelForChoices?.choices || [];
    if (choices.length && n >= 1 && n <= choices.length) {
      title = choices[n - 1];
    }

    await db.conciergeRequest.create({
      data: {
        stayId: stay.id,
        title,
        stage: stay.stage,
        status: "REQUESTED",
        note: needHelp ? "WhatsApp help signal" : "WhatsApp reply",
      },
    });

    reply =
      stay.language === "ar"
        ? needHelp
          ? "وصلتنا ملاحظتك — فريق الفندق بيتواصل معك فوراً 🙏"
          : `تم استلام طلبك: ${title}\nرح نأكد لك التفاصيل قريباً ✅`
        : needHelp
          ? "Got it — the hotel team will help you right away."
          : `Request received: ${title}. We'll confirm shortly ✅`;
  } else {
    reply =
      stay.language === "ar"
        ? "حاضر! إذا احتجت أي شي، نحنا موجودين 🌿"
        : "Perfect — ping us anytime you need something 🌿";
  }

  await db.conciergeMessage.create({
    data: {
      stayId: stay.id,
      role: "hotel",
      stage: stay.stage,
      body: reply,
      choices: [],
    },
  });

  const sent = await sendText(replyTo, reply);
  return NextResponse.json({
    ok: true,
    stayId: stay.id,
    replyTo,
    sent: sent.ok,
    sendError: sent.error || null,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sila-evolution-webhook",
    demoPhone: DEMO_PHONE,
  });
}
