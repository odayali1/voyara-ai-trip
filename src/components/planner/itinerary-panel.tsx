"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { ItineraryPlan } from "@/lib/itinerary-schema";

export function ItineraryPanel({
  plan,
  onStopClick,
}: {
  plan: ItineraryPlan | null;
  onStopClick?: (stopId: string, title: string) => void;
}) {
  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--sand)]">
          Your itinerary will unfold here
        </p>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
          Tell Voyara where you want to go. Days, stops, and map pins appear as the plan streams in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1" dir="auto">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--sand)]">
          {plan.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{plan.summary}</p>
      </div>

      {plan.days.map((day, dayIndex) => (
        <motion.section
          key={day.dayNumber}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: dayIndex * 0.08 }}
          className="rounded-xl border border-[var(--line)] bg-black/20 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Badge>Day {day.dayNumber}</Badge>
            <h3 className="text-sm font-medium text-[var(--sand)]">
              {day.title || `Day ${day.dayNumber}`}
            </h3>
          </div>
          <ol className="space-y-3">
            {day.stops.map((stop, stopIndex) => {
              const stopId = `${day.dayNumber}-${stopIndex}`;
              return (
                <li key={stopId}>
                  <button
                    type="button"
                    onClick={() => onStopClick?.(stopId, stop.title)}
                    className="w-full rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-[var(--line)] hover:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-[var(--sand)]">
                          {stop.time ? `${stop.time} · ` : ""}
                          {stop.title}
                        </div>
                        {stop.address && (
                          <div className="text-xs text-[var(--muted)]">{stop.address}</div>
                        )}
                        {stop.tips && (
                          <div className="mt-1 text-xs text-[var(--sand)]/80">{stop.tips}</div>
                        )}
                      </div>
                      {stop.estimatedCost != null && (
                        <span className="text-xs text-[var(--accent)]">
                          {formatCurrency(stop.estimatedCost, stop.currency || "USD")}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </motion.section>
      ))}
    </div>
  );
}
