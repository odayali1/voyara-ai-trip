import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";

function riskFromScore(score: number | null | undefined, replied: boolean): string {
  if (!replied) return "SILENT";
  if (score == null) return "WATCH";
  if (score <= 2) return "HIGH";
  if (score === 3) return "WATCH";
  return "LOW";
}

async function ensureDemoPulses(providerId: string) {
  const count = await db.guestStayPulse.count({ where: { providerId } });
  if (count > 0) return;

  const now = new Date();
  const day = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  };

  await db.guestStayPulse.createMany({
    data: [
      {
        providerId,
        guestName: "Sara Al-Hassan",
        guestEmail: "sara@example.com",
        roomName: "Desert View King Room",
        checkIn: day(-1),
        checkOut: day(2),
        status: "IN_HOUSE",
        riskLevel: "SILENT",
        pulseSentAt: null,
        pulseScore: null,
      },
      {
        providerId,
        guestName: "James Carter",
        guestEmail: "james@example.com",
        roomName: "Family Suite Twin",
        checkIn: day(-2),
        checkOut: day(1),
        status: "RECOVERING",
        riskLevel: "HIGH",
        pulseScore: 2,
        pulseNote: "AC noisy at night, kids couldn't sleep.",
        pulseSentAt: day(-1),
        pulseRepliedAt: day(-1),
      },
      {
        providerId,
        guestName: "Nora Kim",
        guestEmail: "nora@example.com",
        roomName: "Nabataean Heritage Room",
        checkIn: day(-3),
        checkOut: day(0),
        status: "SAVED",
        riskLevel: "LOW",
        pulseScore: 5,
        pulseNote: "Loved the courtyard tea. Staff fixed shower fast!",
        pulseSentAt: day(-2),
        pulseRepliedAt: day(-2),
        recoveryNote: "Housekeeping upgrade + welcome sweets sent same hour.",
      },
      {
        providerId,
        guestName: "Omar Faris",
        roomName: "Petra Sunrise Package",
        checkIn: day(0),
        checkOut: day(3),
        status: "IN_HOUSE",
        riskLevel: "WATCH",
        pulseSentAt: day(0),
        pulseScore: null,
      },
    ],
  });
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
    return NextResponse.json({ pulses: [], summary: null });
  }

  await ensureDemoPulses(profile.id);

  const pulses = await db.guestStayPulse.findMany({
    where: { providerId: profile.id },
    orderBy: { updatedAt: "desc" },
  });

  const summary = {
    inHouse: pulses.filter((p) => p.status === "IN_HOUSE" || p.status === "RECOVERING").length,
    silent: pulses.filter((p) => p.riskLevel === "SILENT").length,
    highRisk: pulses.filter((p) => p.riskLevel === "HIGH").length,
    saved: pulses.filter((p) => p.status === "SAVED").length,
    avgScore:
      Math.round(
        (pulses.filter((p) => p.pulseScore != null).reduce((s, p) => s + (p.pulseScore || 0), 0) /
          Math.max(pulses.filter((p) => p.pulseScore != null).length, 1)) *
          10
      ) / 10,
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    summary,
    pulses: pulses.map((p) => ({
      ...p,
      pulseUrl: `${appUrl}/pulse/${p.token}`,
    })),
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

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "send_pulse") {
    const id = String(body.id || "");
    const pulse = await db.guestStayPulse.update({
      where: { id },
      data: {
        pulseSentAt: new Date(),
      },
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      ok: true,
      pulse,
      pulseUrl: `${appUrl}/pulse/${pulse.token}`,
      message: "Mid-stay pulse link ready — send via WhatsApp/SMS/email.",
    });
  }

  if (action === "recover") {
    const id = String(body.id || "");
    const recoveryNote = String(body.recoveryNote || "Recovery action taken").trim();
    const pulse = await db.guestStayPulse.update({
      where: { id },
      data: {
        status: "SAVED",
        riskLevel: "LOW",
        recoveryNote,
      },
    });
    return NextResponse.json({ ok: true, pulse });
  }

  if (action === "create") {
    const pulse = await db.guestStayPulse.create({
      data: {
        providerId: profile.id,
        guestName: String(body.guestName || "Guest"),
        guestEmail: body.guestEmail || null,
        roomName: String(body.roomName || "Room"),
        checkIn: new Date(body.checkIn || Date.now()),
        checkOut: new Date(body.checkOut || Date.now() + 86400000 * 2),
        status: "IN_HOUSE",
        riskLevel: "WATCH",
      },
    });
    return NextResponse.json({ ok: true, pulse });
  }

  // Simulate a silent guest turning into a bad-score reply (demo)
  if (action === "simulate_reply") {
    const id = String(body.id || "");
    const score = Number(body.score || 2);
    const pulse = await db.guestStayPulse.update({
      where: { id },
      data: {
        pulseScore: score,
        pulseNote: String(body.note || "Something felt off during the stay."),
        pulseRepliedAt: new Date(),
        pulseSentAt: new Date(),
        riskLevel: riskFromScore(score, true),
        status: score <= 2 ? "RECOVERING" : "IN_HOUSE",
      },
    });
    return NextResponse.json({ ok: true, pulse });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
