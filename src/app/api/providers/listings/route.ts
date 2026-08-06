import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { geocodePlace } from "@/lib/geo";
import type { ListingCategory, ListingStatus } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const category = searchParams.get("category") as ListingCategory | null;

  const listings = await db.providerListing.findMany({
    where: {
      status: "ACTIVE",
      provider: { status: "APPROVED" },
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(category ? { category } : {}),
    },
    include: {
      provider: { select: { businessName: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(listings);
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
    return NextResponse.json({ error: "Create a provider profile first" }, { status: 400 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  const city = String(body.city || "").trim();
  const country = String(body.country || "").trim();
  if (!title || !city || !country) {
    return NextResponse.json({ error: "title, city, country required" }, { status: 400 });
  }

  let lat = body.lat as number | undefined;
  let lng = body.lng as number | undefined;
  if (lat == null || lng == null) {
    const geo = await geocodePlace(`${title}, ${city}, ${country}`);
    lat = geo?.lat;
    lng = geo?.lng;
  }

  const listing = await db.providerListing.create({
    data: {
      providerId: profile.id,
      category: body.category as ListingCategory,
      title,
      description: String(body.description || ""),
      city,
      country,
      lat,
      lng,
      priceFrom: body.priceFrom != null ? Number(body.priceFrom) : null,
      currency: body.currency || "USD",
      images: body.images || [],
      tags: body.tags || [],
      amenities: body.amenities || [],
      status: (body.status as ListingStatus) || "ACTIVE",
    },
  });

  return NextResponse.json(listing);
}
