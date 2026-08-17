import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { normalizeWhatsAppNumber } from "@/lib/evolution";
import { hotelStaffBrief, hydrateThinGuestIntel, intelFromGuest } from "@/lib/guest-intel";

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

  const tripPhones = phones;
  const tripRows =
    tripPhones.length > 0
      ? await db.trip.findMany({
          where: { guestPhone: { in: tripPhones } },
          select: { id: true, guestPhone: true },
        })
      : [];
  const chat =
    tripRows.length > 0
      ? await db.chatMessage.findMany({
          where: { tripId: { in: tripRows.map((t) => t.id) } },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { tripId: true, role: true, content: true },
        })
      : [];
  const phoneByTrip = Object.fromEntries(tripRows.map((t) => [t.id, t.guestPhone]));
  for (const g of guests) {
    const convo = chat
      .filter((m) => phoneByTrip[m.tripId] === g.phone)
      .slice()
      .reverse()
      .map((m) => `${m.role === "user" ? "Traveler" : "Voyara"}: ${m.content}`)
      .join("\n");
    const intel = await hydrateThinGuestIntel(g.id, convo);
    if (intel) byPhone[g.phone] = { ...g, ...intel };
  }

  return NextResponse.json({
    arrivals: stays.map((s) => {
      const g = s.guestPhone ? byPhone[s.guestPhone] : null;
      const brief = g ? hotelStaffBrief(intelFromGuest(g)) : null;
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
        vibe: brief?.interests || [],
        travelerType: brief?.travelerType || null,
        travelingWith: brief?.travelingWith || null,
        careNeeds: brief?.careNeeds || [],
        healthNotes: brief?.healthNotes || null,
        pace: brief?.pace || null,
        preferences: brief?.preferences || [],
        staffNote: brief?.staffNote || null,
        openRequests: s.requests.map((r) => r.title),
      };
    }),
  });
}
