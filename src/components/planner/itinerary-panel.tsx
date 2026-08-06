"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { ItineraryPlan } from "@/lib/itinerary-schema";

export function ItineraryPanel({
  plan,
  loading = false,
  onStopClick,
}: {
  plan: ItineraryPlan | null;
  loading?: boolean;
  onStopClick?: (stopId: string, title: string) => void;
}) {
  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          {loading ? "Assembling your days…" : "Your itinerary unfolds here"}
        </p>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
          {loading
            ? "Landmarks, food stops, and experiences are being pinned."
            : "Chat with Voyara — days, stops, and map pins appear together."}
        </p>
        {loading && (
          <div className="mt-5 w-full space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="planning-pulse h-14 rounded-xl bg-[rgba(15,156,140,0.08)]"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1" dir="auto">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          {plan.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{plan.summary}</p>
      </div>

      {plan.days.map((day, dayIndex) => (
        <motion.section
          key={day.dayNumber}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: dayIndex * 0.06 }}
          className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <Badge>Day {day.dayNumber}</Badge>
            <h3 className="text-sm font-medium text-[var(--ink)]">
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
                    className="w-full rounded-xl border border-transparent px-2 py-2 text-left transition hover:border-[var(--line)] hover:bg-[rgba(15,156,140,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-[var(--ink)]">
                          {stop.time ? `${stop.time} · ` : ""}
                          {stop.title}
                        </div>
                        {stop.category && (
                          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                            {stop.category}
                          </div>
                        )}
                        {stop.address && (
                          <div className="text-xs text-[var(--muted)]">{stop.address}</div>
                        )}
                        {stop.tips && (
                          <div className="mt-1 text-xs text-[var(--ink)]/80">{stop.tips}</div>
                        )}
                      </div>
                      {stop.estimatedCost != null && (
                        <span className="text-xs font-semibold text-[var(--accent-2)]">
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
