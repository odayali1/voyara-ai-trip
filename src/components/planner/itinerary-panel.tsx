"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { textDirection } from "@/lib/has-arabic";
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
    if (loading) {
      return (
        <div className="space-y-3 p-1">
          <p className="text-sm font-medium text-[var(--ink)]">Building itinerary…</p>
          <p className="text-xs text-[var(--muted)]">Stops will fill in when the plan is ready.</p>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="planning-pulse h-12 rounded-xl bg-[rgba(15,156,140,0.08)]"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-[160px] flex-col justify-center px-2">
        <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Day-by-day plan
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Appears here after you chat with Voyara.
        </p>
      </div>
    );
  }

  const dir = textDirection(`${plan.title} ${plan.summary}`);

  return (
    <div className="space-y-4 p-1" dir={dir}>
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
              const stopDir = textDirection(stop.title);
              return (
                <li key={stopId}>
                  <button
                    type="button"
                    dir={stopDir}
                    onClick={() => onStopClick?.(stopId, stop.title)}
                    className="w-full rounded-xl border border-transparent px-2 py-2 text-start transition hover:border-[var(--line)] hover:bg-[rgba(15,156,140,0.06)]"
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
                        <span className="shrink-0 text-xs font-semibold text-[var(--accent-2)]">
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
