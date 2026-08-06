import { NextResponse } from "next/server";
import { assertApiRole } from "@/lib/auth-server";
import { db } from "@/lib/db";

export async function GET() {
  const gate = await assertApiRole(["ADMIN"]);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const [
    travelers,
    trips,
    events,
    snapshots,
    listings,
    providersPending,
  ] = await Promise.all([
    db.user.count({ where: { role: "TRAVELER" } }),
    db.trip.findMany({ select: { destination: true, travelerType: true, budget: true } }),
    db.behaviorEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    }),
    db.intentSnapshot.findMany(),
    db.providerListing.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true, category: true, city: true },
    }),
    db.providerProfile.count({ where: { status: "PENDING" } }),
  ]);

  const destinationCounts: Record<string, number> = {};
  for (const trip of trips) {
    const key = trip.destination || "Unknown";
    destinationCounts[key] = (destinationCounts[key] || 0) + 1;
  }

  const topDestinations = Object.entries(destinationCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const travelerTypeMix = [
    { name: "Family", value: snapshots.filter((s) => s.isFamily).length },
    { name: "Couple", value: snapshots.filter((s) => s.isCouple).length },
    { name: "Solo", value: snapshots.filter((s) => s.isSolo).length },
    { name: "Friends", value: snapshots.filter((s) => s.isFriends).length },
  ];

  const interestTotals: Record<string, number> = {};
  for (const snap of snapshots) {
    const scores = (snap.interestScores as Record<string, number>) || {};
    for (const [k, v] of Object.entries(scores)) {
      interestTotals[k] = (interestTotals[k] || 0) + v;
    }
  }
  const topInterests = Object.entries(interestTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const funnel = {
    landed: events.find((e) => e.eventType === "page_landed")?._count._all || 0,
    preferences: events.find((e) => e.eventType === "preference_set")?._count._all || 0,
    chats: events.find((e) => e.eventType === "chat_sent")?._count._all || 0,
    generated: events.find((e) => e.eventType === "trip_generated")?._count._all || 0,
    listingViews: events.find((e) => e.eventType === "listing_viewed")?._count._all || 0,
  };

  const avgDays =
    trips.length === 0
      ? 0
      : Math.round(
          ((await db.itineraryDay.count()) / Math.max(trips.length, 1)) * 10
        ) / 10;

  return NextResponse.json({
    kpis: {
      travelers,
      trips: trips.length,
      avgDays,
      providersPending,
      activeListings: listings.length,
      luxurySeekers: snapshots.filter((s) => s.isLuxury).length,
      foodieSeekers: snapshots.filter((s) => s.isFoodie).length,
    },
    topDestinations,
    travelerTypeMix,
    topInterests,
    funnel,
    eventBreakdown: events.map((e) => ({
      name: e.eventType,
      value: e._count._all,
    })),
  });
}
