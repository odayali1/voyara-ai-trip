import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { trackEvent } from "@/lib/intent";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await db.trip.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      days: { include: { stops: true }, orderBy: { dayNumber: "asc" } },
    },
  });

  return NextResponse.json(trips);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const destination = String(body.destination || "TBD");
  const title = String(body.title || `Trip to ${destination}`);

  const trip = await db.trip.create({
    data: {
      ownerId: session.user.id,
      title,
      destination,
      travelerType: body.travelerType,
      budget: body.budget,
    },
  });

  await trackEvent(
    "destination_searched",
    { destination, tripId: trip.id },
    session.user.id
  );

  return NextResponse.json(trip);
}
