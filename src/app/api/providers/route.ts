import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import type { ListingCategory } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: { listings: { orderBy: { updatedAt: "desc" } } },
  });

  return NextResponse.json(profile);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const businessName = String(body.businessName || "").trim();
  if (!businessName) {
    return NextResponse.json({ error: "businessName required" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { role: "PROVIDER" },
  });

  const profile = await db.providerProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      businessName,
      categories: (body.categories || []) as ListingCategory[],
      description: body.description,
      website: body.website,
      phone: body.phone,
      city: body.city,
      country: body.country,
      status: "PENDING",
    },
    update: {
      businessName,
      categories: (body.categories || []) as ListingCategory[],
      description: body.description,
      website: body.website,
      phone: body.phone,
      city: body.city,
      country: body.country,
    },
    include: { listings: true },
  });

  return NextResponse.json(profile);
}
