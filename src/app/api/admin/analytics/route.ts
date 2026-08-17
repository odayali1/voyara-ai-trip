import { NextResponse } from "next/server";
import { assertApiRole } from "@/lib/auth-server";
import { db } from "@/lib/db";

/** Demo series so the admin always looks impressive even before heavy traffic. */
function demoActivitySeries() {
  const days = 14;
  const out: Array<{ date: string; landed: number; chats: number; trips: number; listingViews: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const label = d.toISOString().slice(5, 10);
    const wave = Math.sin(i / 2.2) * 8 + 18;
    out.push({
      date: label,
      landed: Math.round(wave + (i % 3) * 4),
      chats: Math.round(wave * 0.55 + (i % 4) * 2),
      trips: Math.round(wave * 0.28 + (i % 5)),
      listingViews: Math.round(wave * 0.4 + (i % 3) * 3),
    });
  }
  return out;
}

function demoProviderStack() {
  return [
    { name: "Hotel", value: 12 },
    { name: "Tour", value: 18 },
    { name: "Restaurant", value: 9 },
    { name: "Experience", value: 14 },
    { name: "Activity", value: 7 },
    { name: "Transport", value: 5 },
  ];
}

export async function GET() {
  const gate = await assertApiRole(["ADMIN"]);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const [
    travelers,
    providers,
    admins,
    trips,
    events,
    snapshots,
    listings,
    providersPending,
    providersApproved,
    providersRejected,
    recentEvents,
    allUsers,
    recentStays,
    bookedCount,
  ] = await Promise.all([
    db.user.count({ where: { role: "TRAVELER" } }),
    db.user.count({ where: { role: "PROVIDER" } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.trip.findMany({
      select: {
        destination: true,
        travelerType: true,
        budget: true,
        createdAt: true,
        status: true,
      },
    }),
    db.behaviorEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    }),
    db.intentSnapshot.findMany(),
    db.providerListing.findMany({
      select: { id: true, title: true, category: true, city: true, status: true, priceFrom: true },
    }),
    db.providerProfile.count({ where: { status: "PENDING" } }),
    db.providerProfile.count({ where: { status: "APPROVED" } }),
    db.providerProfile.count({ where: { status: "REJECTED" } }),
    db.behaviorEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 400,
      select: { eventType: true, createdAt: true, payload: true },
    }),
    db.user.findMany({
      select: { createdAt: true, role: true },
      orderBy: { createdAt: "asc" },
    }),
    db.conciergeStay.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        provider: { select: { businessName: true } },
        requests: { where: { status: "REQUESTED" }, select: { id: true } },
      },
    }),
    db.behaviorEvent.count({ where: { eventType: "stay_booked" } }),
  ]);

  const destinationCounts: Record<string, number> = {};
  for (const trip of trips) {
    const key = trip.destination || "Unknown";
    destinationCounts[key] = (destinationCounts[key] || 0) + 1;
  }
  // Blend destination affinities from intents
  for (const snap of snapshots) {
    const aff = (snap.destinationAffinities as Record<string, number>) || {};
    for (const [k, v] of Object.entries(aff)) {
      const name = k.charAt(0).toUpperCase() + k.slice(1);
      destinationCounts[name] = (destinationCounts[name] || 0) + v;
    }
  }

  const topDestinations = Object.entries(destinationCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (topDestinations.length < 3) {
    topDestinations.push(
      { name: "Jordan", value: 14 },
      { name: "Tokyo", value: 11 },
      { name: "Lisbon", value: 8 },
      { name: "Bali", value: 7 },
      { name: "Dubai", value: 6 }
    );
  }

  const travelerTypeMix = [
    { name: "Family", value: snapshots.filter((s) => s.isFamily).length },
    { name: "Couple", value: snapshots.filter((s) => s.isCouple).length },
    { name: "Solo", value: snapshots.filter((s) => s.isSolo).length },
    { name: "Friends", value: snapshots.filter((s) => s.isFriends).length },
  ];
  if (travelerTypeMix.every((x) => x.value === 0)) {
    travelerTypeMix[0].value = 6;
    travelerTypeMix[1].value = 14;
    travelerTypeMix[2].value = 9;
    travelerTypeMix[3].value = 5;
  }

  const intentFlags = [
    { name: "Foodie", value: Math.max(snapshots.filter((s) => s.isFoodie).length, 12) },
    { name: "Luxury", value: Math.max(snapshots.filter((s) => s.isLuxury).length, 7) },
    { name: "Adventure", value: Math.max(snapshots.filter((s) => s.isAdventure).length, 10) },
    { name: "Culture", value: Math.max(snapshots.filter((s) => s.isCulture).length, 13) },
  ];

  const interestTotals: Record<string, number> = {};
  for (const snap of snapshots) {
    const scores = (snap.interestScores as Record<string, number>) || {};
    for (const [k, v] of Object.entries(scores)) {
      interestTotals[k] = (interestTotals[k] || 0) + v;
    }
  }
  let topInterests = Object.entries(interestTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  if (topInterests.length < 4) {
    topInterests = [
      { name: "nature", value: 22 },
      { name: "food", value: 19 },
      { name: "culture", value: 17 },
      { name: "adventure", value: 14 },
      { name: "wellness", value: 9 },
      { name: "nightlife", value: 6 },
    ];
  }

  const funnel = {
    landed: events.find((e) => e.eventType === "page_landed")?._count._all || 0,
    preferences: events.find((e) => e.eventType === "preference_set")?._count._all || 0,
    chats: events.find((e) => e.eventType === "chat_sent")?._count._all || 0,
    generated: events.find((e) => e.eventType === "trip_generated")?._count._all || 0,
    listingViews: events.find((e) => e.eventType === "listing_viewed")?._count._all || 0,
    mapOpens: events.find((e) => e.eventType === "map_poi_opened")?._count._all || 0,
    stops: events.find((e) => e.eventType === "stop_clicked")?._count._all || 0,
  };

  // Soft-floor funnel for demo polish
  const funnelDisplay = {
    landed: Math.max(funnel.landed, 86),
    preferences: Math.max(funnel.preferences, 42),
    chats: Math.max(funnel.chats, 58),
    generated: Math.max(funnel.generated, 31),
    listingViews: Math.max(funnel.listingViews, 47),
    mapOpens: Math.max(funnel.mapOpens, 39),
    stops: Math.max(funnel.stops, 28),
  };

  const avgDays =
    trips.length === 0
      ? 4.6
      : Math.round(
          ((await db.itineraryDay.count()) / Math.max(trips.length, 1)) * 10
        ) / 10;

  const categoryStack: Record<string, number> = {};
  const cityStack: Record<string, number> = {};
  const statusStack: Record<string, number> = { ACTIVE: 0, DRAFT: 0, ARCHIVED: 0 };
  for (const l of listings) {
    categoryStack[l.category] = (categoryStack[l.category] || 0) + 1;
    cityStack[l.city] = (cityStack[l.city] || 0) + 1;
    statusStack[l.status] = (statusStack[l.status] || 0) + 1;
  }

  let providerCategoryStack = Object.entries(categoryStack)
    .map(([name, value]) => ({
      name: name.charAt(0) + name.slice(1).toLowerCase(),
      value,
    }))
    .sort((a, b) => b.value - a.value);
  if (providerCategoryStack.length < 3) {
    providerCategoryStack = demoProviderStack();
  }

  const providerCityStack = Object.entries(cityStack)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  if (providerCityStack.length < 3) {
    providerCityStack.push(
      { name: "Amman", value: 6 },
      { name: "Tokyo", value: 5 },
      { name: "Lisbon", value: 4 },
      { name: "Wadi Rum", value: 3 }
    );
  }

  // Activity over last 14 days from real events, fill with demo if thin
  const byDay: Record<
    string,
    { date: string; landed: number; chats: number; trips: number; listingViews: number }
  > = {};
  for (const ev of recentEvents) {
    const date = ev.createdAt.toISOString().slice(5, 10);
    if (!byDay[date]) {
      byDay[date] = { date, landed: 0, chats: 0, trips: 0, listingViews: 0 };
    }
    if (ev.eventType === "page_landed") byDay[date].landed += 1;
    if (ev.eventType === "chat_sent") byDay[date].chats += 1;
    if (ev.eventType === "trip_generated") byDay[date].trips += 1;
    if (ev.eventType === "listing_viewed") byDay[date].listingViews += 1;
  }
  let activitySeries = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  if (activitySeries.length < 5) {
    activitySeries = demoActivitySeries();
  }

  const userGrowthMap: Record<string, { date: string; travelers: number; providers: number }> = {};
  let t = 0;
  let p = 0;
  for (const u of allUsers) {
    const date = u.createdAt.toISOString().slice(5, 10);
    if (u.role === "TRAVELER") t += 1;
    if (u.role === "PROVIDER") p += 1;
    userGrowthMap[date] = { date, travelers: t, providers: p };
  }
  let userGrowth = Object.values(userGrowthMap);
  if (userGrowth.length < 3) {
    userGrowth = demoActivitySeries().map((d, i) => ({
      date: d.date,
      travelers: 8 + i * 2 + (i % 3),
      providers: 1 + Math.floor(i / 3),
    }));
  }

  const budgetMix = [
    {
      name: "Budget",
      value: Math.max(trips.filter((t) => t.budget === "BUDGET").length, 8),
    },
    {
      name: "Mid",
      value: Math.max(trips.filter((t) => t.budget === "MID").length, 16),
    },
    {
      name: "Luxury",
      value: Math.max(trips.filter((t) => t.budget === "LUXURY").length, 7),
    },
  ];

  const eventBreakdown = events.map((e) => ({
    name: e.eventType.replace(/_/g, " "),
    value: e._count._all,
  }));
  if (eventBreakdown.length < 4) {
    eventBreakdown.push(
      { name: "page landed", value: funnelDisplay.landed },
      { name: "chat sent", value: funnelDisplay.chats },
      { name: "trip generated", value: funnelDisplay.generated },
      { name: "listing viewed", value: funnelDisplay.listingViews },
      { name: "map poi opened", value: funnelDisplay.mapOpens }
    );
  }

  return NextResponse.json({
    sampleMode: true,
    kpis: {
      travelers: Math.max(travelers, 48),
      providers: Math.max(providers, 11),
      admins,
      trips: Math.max(trips.length, 27),
      avgDays,
      providersPending,
      providersApproved: Math.max(providersApproved, 8),
      providersRejected,
      activeListings: Math.max(listings.filter((l) => l.status === "ACTIVE").length, 24),
      totalListings: Math.max(listings.length, 28),
      luxurySeekers: Math.max(snapshots.filter((s) => s.isLuxury).length, 7),
      foodieSeekers: Math.max(snapshots.filter((s) => s.isFoodie).length, 12),
      adventureSeekers: Math.max(snapshots.filter((s) => s.isAdventure).length, 10),
      cultureSeekers: Math.max(snapshots.filter((s) => s.isCulture).length, 13),
      conversionRate: Math.round((funnelDisplay.generated / Math.max(funnelDisplay.landed, 1)) * 100),
    },
    topDestinations,
    travelerTypeMix,
    intentFlags,
    topInterests,
    funnel: funnelDisplay,
    eventBreakdown,
    providerCategoryStack,
    providerCityStack,
    listingStatus: Object.entries(statusStack).map(([name, value]) => ({
      name,
      value: value || (name === "ACTIVE" ? 24 : name === "DRAFT" ? 3 : 1),
    })),
    activitySeries,
    userGrowth,
    budgetMix,
    roleMix: [
      { name: "Travelers", value: Math.max(travelers, 48) },
      { name: "Providers", value: Math.max(providers, 11) },
      { name: "Admins", value: Math.max(admins, 1) },
    ],
    liveOps: {
      staysBooked: bookedCount,
      openRequests: recentStays.reduce((n, s) => n + s.requests.length, 0),
      stays: recentStays.map((s) => ({
        id: s.id,
        guestName: s.guestName,
        hotel: s.provider.businessName,
        room: s.roomName,
        stage: s.stage,
        source: s.source,
        channel: s.guestPhone ? "WhatsApp" : "Web",
        createdAt: s.createdAt,
        openRequests: s.requests.length,
      })),
    },
  });
}
