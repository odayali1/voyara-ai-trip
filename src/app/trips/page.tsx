import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser, requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TripsPage() {
  const session = await requireSession();
  const user = await getCurrentUser();
  const trips = await db.trip.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { days: true },
  });

  return (
    <main className="app-shell min-h-screen">
      <SiteHeader role={user?.role} sticky />
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-8 md:px-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--sand)]">
              Your trips
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Saved plans you can reopen and share.</p>
          </div>
          <Button asChild>
            <Link href="/planner">New plan</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="surface-card p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--sand)]">
                  {trip.title}
                </h2>
                <Badge variant="outline">{trip.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{trip.destination}</p>
              <p className="mt-4 text-xs text-[var(--muted)]">
                {trip.days.length} days · updated {trip.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
          {trips.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-[var(--muted)] md:col-span-2">
              No trips yet. Start in the planner and save your first itinerary.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
