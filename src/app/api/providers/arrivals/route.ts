import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { normalizeWhatsAppNumber } from "@/lib/evolution";

export const dynamic = "force-dynamic";

function firstName(name: string | null | undefined) {
  if (!name) return "Guest";
  return name.split(/\s+/)[0];
}

function maskPhone(phone: string | null | undefined) {
  const n = normalizeWhatsAppNumber(phone || "") || "";
  if (n.length < 6) return "••••";
  return `••••${n.slice(-4)}`;
}

/** Provider: arriving guests only — no full chat, no memory dump, no full phone. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ arrivals: [] });
  }

  const stays = await db.conciergeStay.findMany({
    where: { providerId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      requests: {
        where: { status: "REQUESTED" },
        select: { title: true, status: true },
      },
    },
  });

  const phones = stays.map((s) => s.guestPhone).filter(Boolean) as string[];
  const guests = await db.whatsAppGuest.findMany({
    where: { phone: { in: phones } },
  });
  const byPhone = Object.fromEntries(guests.map((g) => [g.phone, g]));

  return NextResponse.json({
    arrivals: stays.map((s) => {
      const g = s.guestPhone ? byPhone[s.guestPhone] : null;
      return {
        stayId: s.id,
        firstName: firstName(s.guestName || g?.displayName),
        phoneMasked: maskPhone(s.guestPhone),
        room: s.roomName,
        stage: s.stage,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        source: s.source,
        tripCity: s.tripLabel,
        vibe: (g?.interests || []).slice(0, 3),
        travelerType: g?.travelerType || null,
        openRequests: s.requests.map((r) => r.title),
      };
    }),
  });
}
