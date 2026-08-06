import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { TripMap } from "@/components/map/trip-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ShareTripPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const trip = await db.trip.findUnique({
    where: { shareId },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: { stops: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!trip) notFound();

  const stops = trip.days.flatMap((day) =>
    day.stops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: s.id,
        title: s.title,
        lat: s.lat!,
        lng: s.lng!,
        dayNumber: day.dayNumber,
      }))
  );

  return (
    <main className="app-shell min-h-screen px-6 py-10 md:px-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] text-3xl text-[var(--sand)]">
          Voyara
        </Link>
        <Button asChild>
          <Link href="/signup">Plan your own</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Badge variant="outline">Shared itinerary</Badge>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--sand)]">
            {trip.title}
          </h1>
          <p className="mt-2 text-[var(--muted)]">{trip.summary}</p>
          <div className="mt-8 space-y-4">
            {trip.days.map((day) => (
              <section
                key={day.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
              >
                <h2 className="text-sm font-medium text-[var(--accent)]">
                  Day {day.dayNumber}
                  {day.title ? ` · ${day.title}` : ""}
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--sand)]">
                  {day.stops.map((stop) => (
                    <li key={stop.id}>
                      {stop.time ? `${stop.time} · ` : ""}
                      {stop.title}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
        <div className="min-h-[420px] overflow-hidden rounded-2xl border border-[var(--line)]">
          <TripMap stops={stops} className="h-full min-h-[420px] w-full" />
        </div>
      </div>
    </main>
  );
}
