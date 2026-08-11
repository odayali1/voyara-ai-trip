import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pulse = await db.guestStayPulse.findUnique({
    where: { token },
    include: {
      provider: { select: { businessName: true, city: true, country: true } },
    },
  });
  if (!pulse) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    guestName: pulse.guestName,
    roomName: pulse.roomName,
    hotelName: pulse.provider.businessName,
    city: pulse.provider.city,
    alreadyReplied: Boolean(pulse.pulseRepliedAt),
    pulseScore: pulse.pulseScore,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "score 1-5 required" }, { status: 400 });
  }

  const existing = await db.guestStayPulse.findUnique({ where: { token } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const riskLevel = score <= 2 ? "HIGH" : score === 3 ? "WATCH" : "LOW";
  const pulse = await db.guestStayPulse.update({
    where: { token },
    data: {
      pulseScore: score,
      pulseNote: body.note ? String(body.note).slice(0, 500) : null,
      pulseRepliedAt: new Date(),
      pulseSentAt: existing.pulseSentAt || new Date(),
      riskLevel,
      status: score <= 2 ? "RECOVERING" : existing.status,
    },
  });

  return NextResponse.json({
    ok: true,
    thankYou:
      score <= 2
        ? "Thank you — the hotel team has been alerted and will help right away."
        : "Thank you — glad we checked in. Enjoy the rest of your stay!",
    pulse: { score: pulse.pulseScore, riskLevel: pulse.riskLevel },
  });
}
