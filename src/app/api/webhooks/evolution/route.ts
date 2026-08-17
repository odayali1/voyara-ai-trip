import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractInboundText, normalizeWhatsAppNumber, sendText } from "@/lib/evolution";

export const dynamic = "force-dynamic";

/**
 * Evolution API → Voyara inbound WhatsApp webhook.
 * Maps guest replies to ConciergeStay by phone number.
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

  // Ignore non-message events quietly
  if (event && !event.includes("messages.upsert") && !event.includes("messages_upsert")) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const { fromMe, number, text } = extractInboundText(payload);
  if (fromMe || !number || !text) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const stays = await db.conciergeStay.findMany({
    where: { stage: { not: "DONE" } },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  const stay =
    stays.find((s) => normalizeWhatsAppNumber(s.guestPhone) === number) ||
    stays.find((s) => {
      const p = normalizeWhatsAppNumber(s.guestPhone);
      return p && (p.endsWith(number.slice(-9)) || number.endsWith(p.slice(-9)));
    });

  if (!stay) {
    return NextResponse.json({ ok: true, unmatched: number });
  }

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
    /لاحقا|تمام|مو الآن|لا شكرا|all set|maybe later|not now|no thanks|i'm all set|^تمام$/i.test(
      text
    );
  const ratingMatch = text.match(/^[1-5]$/);

  if (stay.stage === "POST_STAY" && ratingMatch) {
    await db.conciergeStay.update({
      where: { id: stay.id },
      data: { rating: Number(text), stage: "DONE" },
    });
    const reply =
      stay.language === "ar"
        ? `شكراً لتقييمك ${text}/5 💜 كود خصمك: ${stay.discountCode || "SILA-BACK10"}`
        : `Thanks for rating us ${text}/5 💜 Your code: ${stay.discountCode || "SILA-BACK10"}`;
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: "POST_STAY",
        body: reply,
        choices: [],
      },
    });
    await sendText(number, reply);
  } else if (!skip) {
    const needHelp = /مساعدة|need help|help|بدي مساعدة/i.test(text);
    // Map numeric choice "1" / "2" to last hotel message choices when possible
    let title = text;
    const lastHotel = await db.conciergeMessage.findFirst({
      where: { stayId: stay.id, role: "hotel" },
      orderBy: { createdAt: "desc" },
    });
    const n = Number(text.trim());
    if (lastHotel?.choices?.length && n >= 1 && n <= lastHotel.choices.length) {
      title = lastHotel.choices[n - 1];
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

    const reply =
      stay.language === "ar"
        ? needHelp
          ? "وصلتنا ملاحظتك — فريق الفندق بيتواصل معك فوراً 🙏"
          : `تم استلام طلبك: ${title}\nرح نأكد لك التفاصيل قريباً ✅`
        : needHelp
          ? "Got it — the hotel team will help you right away."
          : `Request received: ${title}. We'll confirm shortly ✅`;

    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: stay.stage,
        body: reply,
        choices: [],
      },
    });
    await sendText(number, reply);
  } else {
    const reply =
      stay.language === "ar"
        ? "حاضر! إذا احتجت أي شي، نحنا موجودين 🌿"
        : "Perfect — ping us anytime you need something 🌿";
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: stay.stage,
        body: reply,
        choices: [],
      },
    });
    await sendText(number, reply);
  }

  return NextResponse.json({ ok: true, stayId: stay.id });
}
