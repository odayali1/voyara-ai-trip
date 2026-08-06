import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { itinerarySchema } from "@/lib/itinerary-schema";
import { trackEvent } from "@/lib/intent";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const trip = await db.trip.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      days: { include: { stops: { orderBy: { order: "asc" } } }, orderBy: { dayNumber: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const trip = await db.trip.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.plan) {
    const plan = itinerarySchema.parse(body.plan);
    await db.itineraryDay.deleteMany({ where: { tripId: id } });
    for (const day of plan.days) {
      await db.itineraryDay.create({
        data: {
          tripId: id,
          dayNumber: day.dayNumber,
          title: day.title,
          notes: day.notes,
          stops: {
            create: day.stops.map((stop, order) => ({
              order,
              title: stop.title,
              time: stop.time,
              category: stop.category,
              address: stop.address,
              lat: stop.lat,
              lng: stop.lng,
              tips: stop.tips,
              estimatedCost: stop.estimatedCost,
              currency: stop.currency || "USD",
            })),
          },
        },
      });
    }
    const updated = await db.trip.update({
      where: { id },
      data: {
        title: plan.title,
        destination: plan.destination,
        summary: plan.summary,
        status: "ACTIVE",
      },
    });
    await trackEvent(
      "itinerary_edited",
      { tripId: id, destination: plan.destination },
      session.user.id
    );
    return NextResponse.json(updated);
  }

  const updated = await db.trip.update({
    where: { id },
    data: {
      title: body.title ?? trip.title,
      destination: body.destination ?? trip.destination,
      summary: body.summary ?? trip.summary,
      status: body.status ?? trip.status,
    },
  });
  return NextResponse.json(updated);
}
