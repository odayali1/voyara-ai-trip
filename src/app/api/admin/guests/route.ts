import { NextResponse } from "next/server";
import { assertApiRole } from "@/lib/auth-server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin: full WhatsApp traveler CRM — nothing hidden. */
export async function GET() {
  const gate = await assertApiRole(["ADMIN"]);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const guests = await db.whatsAppGuest.findMany({
    orderBy: { lastSeenAt: "desc" },
    take: 80,
  });

  const phones = guests.map((g) => g.phone);
  const trips = await db.trip.findMany({
    where: { guestPhone: { in: phones } },
    orderBy: { updatedAt: "desc" },
    select: {
      guestPhone: true,
      title: true,
      destination: true,
      bookedAt: true,
      channel: true,
      updatedAt: true,
    },
  });
  const stays = await db.conciergeStay.findMany({
    where: { guestPhone: { in: phones } },
    orderBy: { createdAt: "desc" },
    select: {
      guestPhone: true,
      roomName: true,
      stage: true,
      source: true,
      createdAt: true,
    },
  });
  const tripIds = (
    await db.trip.findMany({
      where: { guestPhone: { in: phones } },
      select: { id: true, guestPhone: true },
    })
  );
  const messages = tripIds.length
    ? await db.chatMessage.findMany({
        where: { tripId: { in: tripIds.map((t) => t.id) } },
        orderBy: { createdAt: "desc" },
        take: 400,
        select: { tripId: true, role: true, content: true, createdAt: true },
      })
    : [];
  const phoneByTrip = Object.fromEntries(tripIds.map((t) => [t.id, t.guestPhone]));

  return NextResponse.json({
    count: guests.length,
    guests: guests.map((g) => ({
      ...g,
      trips: trips.filter((t) => t.guestPhone === g.phone).slice(0, 4),
      stays: stays.filter((s) => s.guestPhone === g.phone).slice(0, 4),
      recentChat: messages
        .filter((m) => phoneByTrip[m.tripId] === g.phone)
        .slice(0, 8)
        .reverse()
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 400),
          createdAt: m.createdAt,
        })),
    })),
  });
}
