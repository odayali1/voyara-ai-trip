import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  extractInboundText,
  normalizeWhatsAppNumber,
  sendText,
} from "@/lib/evolution";
import { handleTravelerWhatsApp } from "@/lib/whatsapp-traveler";
import { looksLikeWhatsAppReset, resetWhatsAppSession } from "@/lib/whatsapp-reset";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEMO_PHONE = process.env.SILA_DEMO_WHATSAPP || "962796917829";

function isStayChoice(text: string) {
  const t = text.trim();
  if (/^[1-5]$/.test(t)) return true;
  return /لاحقا|تمام|مو الآن|لا شكرا|all set|maybe later|not now|no thanks|i'm all set|بدي مساعدة|need help/i.test(
    t
  );
}

async function findStayForNumber(number: string) {
  const stays = await db.conciergeStay.findMany({
    where: {
      stage: { not: "DONE" },
      guestPhone: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
  return (
    stays.find((s) => normalizeWhatsAppNumber(s.guestPhone) === number) ||
    stays.find((s) => {
      const p = normalizeWhatsAppNumber(s.guestPhone);
      return Boolean(p && (p.endsWith(number.slice(-9)) || number.endsWith(p.slice(-9))));
    }) ||
    null
  );
}

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

  const phone = normalizeWhatsAppNumber(number) || number || DEMO_PHONE;

  if (looksLikeWhatsAppReset(text)) {
    const wiped = await resetWhatsAppSession(phone);
    const sent = await sendText(
      phone,
      "تم المسح. اكتب وجهتك الآن كأنك ضيف جديد — بدون ملف سابق."
    );
    return NextResponse.json({ ok: true, mode: "reset", wiped, sent: sent.ok });
  }

  const stay = await findStayForNumber(phone);
  const guestRow =
    (await db.whatsAppGuest.findUnique({ where: { phone } })) ||
    (await db.whatsAppGuest.findFirst({
      where: { phone: { endsWith: phone.slice(-9) } },
    }));
  const pickingHotel = Boolean(
    !stay &&
      guestRow?.lastOfferIds?.length &&
      isStayChoice(text) &&
      /^[1-5]$/.test(text.trim())
  );

  // SILA numbered replies — skip if they are choosing a Voyara hotel offer
  if (stay && isStayChoice(text) && !pickingHotel) {
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
    const sent = await sendText(phone, reply);
    return NextResponse.json({ ok: true, mode: "stay", stayId: stay.id, sent: sent.ok });
  }

  // Full traveler journey on WhatsApp: plan → maps → book → hotel + admin
  const traveler = await handleTravelerWhatsApp(phone, text);
  return NextResponse.json({ mode: "traveler", ...traveler });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sila-evolution-webhook",
    demoPhone: DEMO_PHONE,
    modes: ["traveler-planning", "hotel-stay"],
  });
}
