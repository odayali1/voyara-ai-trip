import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";

function demoViewsSeries() {
  const out: Array<{ date: string; views: number; saves: number; inquiries: number }> = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const wave = 6 + Math.round(Math.sin(i / 2) * 4) + (i % 3) * 2;
    out.push({
      date: d.toISOString().slice(5, 10),
      views: wave + 4,
      saves: Math.max(1, Math.round(wave * 0.35)),
      inquiries: Math.max(0, Math.round(wave * 0.2)),
    });
  }
  return out;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      listings: {
        select: {
          id: true,
          title: true,
          category: true,
          city: true,
          status: true,
          priceFrom: true,
          currency: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({
      hasProfile: false,
      sampleMode: true,
      kpis: {
        listings: 0,
        active: 0,
        views: 128,
        saves: 34,
        inquiries: 12,
        avgPrice: 0,
        conversion: 9,
      },
      viewsSeries: demoViewsSeries(),
      categoryMix: [],
      topListings: [],
      cityMix: [],
      funnel: { impressions: 128, views: 86, saves: 34, inquiries: 12 },
    });
  }

  const listingIds = new Set(profile.listings.map((l) => l.id));
  const cities = profile.listings.map((l) => l.city.toLowerCase());
  const categories = profile.listings.map((l) => l.category);

  const events = await db.behaviorEvent.findMany({
    where: {
      OR: [
        { eventType: "listing_viewed" },
        { eventType: "listing_saved" },
        { eventType: "stop_clicked" },
        { eventType: "map_poi_opened" },
        { eventType: "stay_booked" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { eventType: true, createdAt: true, payload: true },
  });

  let views = 0;
  let saves = 0;
  let inquiries = 0;
  const byDay: Record<string, { date: string; views: number; saves: number; inquiries: number }> =
    {};
  const byListing: Record<string, number> = {};

  for (const ev of events) {
    const payload = (ev.payload || {}) as Record<string, unknown>;
    const listingId = typeof payload.listingId === "string" ? payload.listingId : null;
    const city =
      typeof payload.city === "string" ? payload.city.toLowerCase() : "";
    const category =
      typeof payload.category === "string" ? payload.category.toUpperCase() : "";

    const matches =
      (listingId && listingIds.has(listingId)) ||
      (city && cities.includes(city)) ||
      (category && categories.includes(category as (typeof categories)[number]));

    if (!matches && profile.listings.length > 0) continue;

    const date = ev.createdAt.toISOString().slice(5, 10);
    if (!byDay[date]) byDay[date] = { date, views: 0, saves: 0, inquiries: 0 };

    if (ev.eventType === "listing_viewed" || ev.eventType === "map_poi_opened") {
      views += 1;
      byDay[date].views += 1;
      const key = listingId || String(payload.title || payload.city || "Listing");
      byListing[key] = (byListing[key] || 0) + 1;
    }
    if (ev.eventType === "listing_saved") {
      saves += 1;
      byDay[date].saves += 1;
    }
    if (ev.eventType === "stop_clicked" || ev.eventType === "stay_booked") {
      inquiries += 1;
      byDay[date].inquiries += 1;
    }
  }

  let viewsSeries = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  if (viewsSeries.length < 5) {
    viewsSeries = demoViewsSeries();
    views = Math.max(views, viewsSeries.reduce((s, d) => s + d.views, 0));
    saves = Math.max(saves, viewsSeries.reduce((s, d) => s + d.saves, 0));
    inquiries = Math.max(inquiries, viewsSeries.reduce((s, d) => s + d.inquiries, 0));
  }

  const categoryMixMap: Record<string, number> = {};
  const cityMixMap: Record<string, number> = {};
  for (const l of profile.listings) {
    categoryMixMap[l.category] = (categoryMixMap[l.category] || 0) + 1;
    cityMixMap[l.city] = (cityMixMap[l.city] || 0) + 1;
  }

  const prices = profile.listings
    .map((l) => l.priceFrom)
    .filter((p): p is number => p != null);
  const avgPrice =
    prices.length === 0
      ? 0
      : Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  const topListings = profile.listings
    .map((l, idx) => ({
      name: l.title.length > 28 ? `${l.title.slice(0, 28)}…` : l.title,
      value: byListing[l.id] || 10 + ((idx * 7 + l.title.length) % 18),
      category: l.category,
      status: l.status,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const impressions = Math.max(views + 42, 160);

  return NextResponse.json({
    hasProfile: true,
    sampleMode: true,
    profile: {
      businessName: profile.businessName,
      status: profile.status,
      city: profile.city,
      country: profile.country,
      categories: profile.categories,
    },
    kpis: {
      listings: profile.listings.length,
      active: profile.listings.filter((l) => l.status === "ACTIVE").length,
      views: Math.max(views, 128),
      saves: Math.max(saves, 34),
      inquiries: Math.max(inquiries, 12),
      avgPrice,
      conversion: Math.round((Math.max(inquiries, 12) / Math.max(views, 128)) * 100),
    },
    viewsSeries,
    categoryMix: Object.entries(categoryMixMap).map(([name, value]) => ({
      name: name.charAt(0) + name.slice(1).toLowerCase(),
      value,
    })),
    cityMix: Object.entries(cityMixMap).map(([name, value]) => ({ name, value })),
    topListings,
    funnel: {
      impressions,
      views: Math.max(views, 86),
      saves: Math.max(saves, 34),
      inquiries: Math.max(inquiries, 12),
    },
  });
}
