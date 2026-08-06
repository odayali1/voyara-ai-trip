import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PlannerStudio } from "@/components/planner/planner-studio";
import { getCurrentUser, requireSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import type { ItineraryPlan } from "@/lib/itinerary-schema";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const user = await getCurrentUser();
  const { id } = await params;

  const trip = await db.trip.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: { stops: { orderBy: { order: "asc" } } },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!trip) notFound();

  const plan: ItineraryPlan | null =
    trip.days.length > 0
      ? {
          title: trip.title,
          destination: trip.destination,
          summary: trip.summary || "",
          days: trip.days.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title || undefined,
            notes: day.notes || undefined,
            stops: day.stops.map((stop) => ({
              title: stop.title,
              time: stop.time || undefined,
              category: stop.category || undefined,
              address: stop.address || undefined,
              lat: stop.lat ?? undefined,
              lng: stop.lng ?? undefined,
              tips: stop.tips || undefined,
              estimatedCost: stop.estimatedCost ?? undefined,
              currency: stop.currency,
            })),
          })),
        }
      : null;

  return (
    <main className="app-shell min-h-screen">
      <div className="relative px-4 pb-4 pt-20 md:px-6">
        <SiteHeader role={user?.role} />
        <PlannerStudio
          tripId={trip.id}
          isAuthenticated
          initialPlan={plan}
          initialMessages={trip.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))}
          destinationHint={trip.destination !== "TBD" ? trip.destination : undefined}
        />
      </div>
    </main>
  );
}
