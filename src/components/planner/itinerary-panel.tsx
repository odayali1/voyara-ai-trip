"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { textDirection } from "@/lib/has-arabic";
import {
  dayHeroImage,
  destinationHeroImage,
  stopImage,
} from "@/lib/place-images";
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
          <div className="planning-pulse h-28 rounded-2xl bg-[rgba(15,156,140,0.1)]" />
          <p className="text-sm font-medium text-[var(--ink)]">Building itinerary…</p>
          <p className="text-xs text-[var(--muted)]">Photos and stops appear when ready.</p>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="planning-pulse h-16 rounded-xl bg-[rgba(15,156,140,0.08)]"
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
  const hero = destinationHeroImage(plan.destination);

  return (
    <div className="space-y-4 p-1" dir={dir}>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="relative h-36 w-full">
          <Image
            src={hero.url}
            alt={hero.alt}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 320px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
            <p className="text-[11px] uppercase tracking-wider text-white/80">
              {plan.destination}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl leading-tight">
              {plan.title}
            </h2>
          </div>
        </div>
        <p className="p-3 text-sm text-[var(--muted)]">{plan.summary}</p>
      </div>

      {plan.days.map((day, dayIndex) => {
        const dayPhoto = dayHeroImage(day.title || "", plan.destination);
        return (
          <motion.section
            key={day.dayNumber}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.05 }}
            className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-sm"
          >
            <div className="relative h-24 w-full">
              <Image
                src={dayPhoto.url}
                alt={dayPhoto.alt}
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
                <Badge className="bg-white/95 text-[var(--ink)]">Day {day.dayNumber}</Badge>
                <h3 className="text-sm font-semibold text-white drop-shadow">
                  {day.title || `Day ${day.dayNumber}`}
                </h3>
              </div>
            </div>

            <ol className="space-y-1 p-2">
              {day.stops.map((stop, stopIndex) => {
                const stopId = `${day.dayNumber}-${stopIndex}`;
                const stopDir = textDirection(stop.title);
                const photo = stopImage(stop.title, stop.category);
                return (
                  <li key={stopId}>
                    <button
                      type="button"
                      dir={stopDir}
                      onClick={() => onStopClick?.(stopId, stop.title)}
                      className="flex w-full gap-3 rounded-xl p-2 text-start transition hover:bg-[rgba(15,156,140,0.07)]"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                        <Image
                          src={photo.url}
                          alt={photo.alt}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium text-[var(--ink)]">
                            {stop.time ? (
                              <span className="text-[var(--accent)]">{stop.time} · </span>
                            ) : null}
                            {stop.title}
                          </div>
                          {stop.estimatedCost != null && (
                            <span className="shrink-0 text-xs font-semibold text-[var(--accent-2)]">
                              {formatCurrency(stop.estimatedCost, stop.currency || "USD")}
                            </span>
                          )}
                        </div>
                        {stop.category && (
                          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                            {stop.category}
                          </div>
                        )}
                        {stop.tips && (
                          <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                            {stop.tips}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </motion.section>
        );
      })}
    </div>
  );
}
