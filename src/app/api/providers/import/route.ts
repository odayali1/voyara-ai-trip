import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { geocodePlace } from "@/lib/geo";
import { parseCatalogFile } from "@/lib/listing-import";

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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required (CSV or JSON)" }, { status: 400 });
  }

  const text = await file.text();
  let items;
  try {
    items = parseCatalogFile(file.name || "catalog.csv", text);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not parse file" },
      { status: 400 }
    );
  }

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "No valid rows found. Need columns: title, city, country (plus optional category, description, priceFrom, tags).",
      },
      { status: 400 }
    );
  }

  const created = [];
  for (const item of items.slice(0, 40)) {
    let lat: number | undefined;
    let lng: number | undefined;
    const geo = await geocodePlace(`${item.title}, ${item.city}, ${item.country}`);
    lat = geo?.lat;
    lng = geo?.lng;

    const listing = await db.providerListing.create({
      data: {
        providerId: profile.id,
        category: item.category,
        title: item.title,
        description: item.description,
        city: item.city,
        country: item.country,
        lat,
        lng,
        priceFrom: item.priceFrom,
        currency: "USD",
        images: item.images,
        tags: item.tags,
        amenities: item.amenities,
        status: "ACTIVE",
      },
    });
    created.push(listing);
  }

  return NextResponse.json({
    imported: created.length,
    skipped: Math.max(items.length - created.length, 0),
    listings: created,
  });
}
