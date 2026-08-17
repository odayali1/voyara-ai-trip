import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { JOURNEY_STAGES } from "@/lib/sila-journey";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const stay = await db.conciergeStay.findUnique({
    where: { token },
    include: {
      provider: {
        select: { businessName: true, city: true, country: true },
      },
      messages: { orderBy: { createdAt: "asc" } },
      requests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!stay) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const offers = await db.conciergeOffer.findMany({
    where: {
      providerId: stay.providerId,
      active: true,
      stage: stay.stage === "DONE" ? "POST_STAY" : stay.stage,
    },
  });

  return NextResponse.json({
    brand: { name: "SILA", tagline: "The smarter way to stay" },
    stages: JOURNEY_STAGES,
    stay: {
      id: stay.id,
      guestName: stay.guestName,
      roomName: stay.roomName,
      stage: stay.stage,
      language: stay.language,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      rating: stay.rating,
      discountCode: stay.discountCode,
      hotelName: stay.provider.businessName,
      city: stay.provider.city,
    },
    messages: stay.messages,
    requests: stay.requests,
    offers,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const stay = await db.conciergeStay.findUnique({ where: { token } });
  if (!stay) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const choice = String(body.choice || "").trim();
  const note = body.note ? String(body.note).slice(0, 400) : null;
  if (!choice) {
    return NextResponse.json({ error: "choice required" }, { status: 400 });
  }

  await db.conciergeMessage.create({
    data: {
      stayId: stay.id,
      role: "guest",
      stage: stay.stage,
      body: choice,
      choices: [],
    },
  });

  const skip =
    /لاحقا|تمام|مو الآن|لا شكرا|all set|maybe later|not now|no thanks|i'm all set/i.test(
      choice
    );

  const ratingMatch = choice.match(/^[1-5]$/);
  if (stay.stage === "POST_STAY" && ratingMatch) {
    await db.conciergeStay.update({
      where: { id: stay.id },
      data: { rating: Number(choice), stage: "DONE" },
    });
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: "POST_STAY",
        body:
          stay.language === "ar"
            ? `شكراً لتقييمك ${choice}/5 💜 كود خصمك: ${stay.discountCode || "SILA-BACK10"}`
            : `Thanks for rating us ${choice}/5 💜 Your code: ${stay.discountCode || "SILA-BACK10"}`,
        choices: [],
      },
    });
  } else if (!skip) {
    const needHelp = /مساعدة|need help|help/i.test(choice);
    await db.conciergeRequest.create({
      data: {
        stayId: stay.id,
        title: choice,
        stage: stay.stage,
        status: needHelp ? "REQUESTED" : "REQUESTED",
        note,
      },
    });
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: stay.stage,
        body:
          stay.language === "ar"
            ? needHelp
              ? "وصلتنا ملاحظتك — فريق الفندق بيتواصل معك فوراً 🙏"
              : `تم استلام طلبك: ${choice}\nرح نأكد لك التفاصيل قريباً ✅`
            : needHelp
              ? "Got it — the hotel team will help you right away."
              : `Request received: ${choice}. We'll confirm shortly ✅`,
        choices: [],
      },
    });
  } else {
    await db.conciergeMessage.create({
      data: {
        stayId: stay.id,
        role: "hotel",
        stage: stay.stage,
        body:
          stay.language === "ar"
            ? "حاضر! إذا احتجت أي شي، نحنا موجودين 🌿"
            : "Perfect — ping us anytime you need something 🌿",
        choices: [],
      },
    });
  }

  const refreshed = await db.conciergeStay.findUnique({
    where: { id: stay.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      requests: { orderBy: { createdAt: "desc" } },
      provider: { select: { businessName: true, city: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    stay: refreshed
      ? {
          id: refreshed.id,
          guestName: refreshed.guestName,
          roomName: refreshed.roomName,
          stage: refreshed.stage,
          language: refreshed.language,
          rating: refreshed.rating,
          discountCode: refreshed.discountCode,
          hotelName: refreshed.provider.businessName,
        }
      : null,
    messages: refreshed?.messages || [],
    requests: refreshed?.requests || [],
  });
}
