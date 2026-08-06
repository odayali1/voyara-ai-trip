import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import type { ListingCategory, ListingStatus } from "@prisma/client";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const listing = await db.providerListing.findUnique({
    where: { id },
    include: { provider: true },
  });
  if (!listing || listing.provider.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await db.providerListing.update({
    where: { id },
    data: {
      title: body.title ?? listing.title,
      description: body.description ?? listing.description,
      category: (body.category as ListingCategory) ?? listing.category,
      city: body.city ?? listing.city,
      country: body.country ?? listing.country,
      priceFrom:
        body.priceFrom != null ? Number(body.priceFrom) : listing.priceFrom,
      tags: body.tags ?? listing.tags,
      amenities: body.amenities ?? listing.amenities,
      status: (body.status as ListingStatus) ?? listing.status,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const listing = await db.providerListing.findUnique({
    where: { id },
    include: { provider: true },
  });
  if (!listing || listing.provider.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.providerListing.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return NextResponse.json({ ok: true });
}
