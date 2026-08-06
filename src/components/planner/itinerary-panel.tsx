"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { textDirection } from "@/lib/has-arabic";
import { resolveDestinationHero, resolvePlaceImage } from "@/lib/place-images";
import { DestinationGallery } from "@/components/planner/destination-gallery";
import type { ItineraryPlan } from "@/lib/itinerary-schema";
import { useState } from "react";

export function ItineraryPanel({
  plan,
  loading = false,
  onStopClick,
}: {
  plan: ItineraryPlan | null;
  loading?: boolean;
  onStopClick?: (stopId: string, title: string) => void;
}) {
  const [loved, setLoved] = useState<Record<string, boolean>>({});

  if (!plan) {
    if (loading) {
      return (
        <div className="space-y-3 p-1">
          <div className="planning-pulse h-28 overflow-hidden rounded-2xl bg-[rgba(15,156,140,0.1)]" />
          <p className="text-sm font-medium text-[var(--ink)]">Building your visual itinerary…</p>
          <p className="text-xs text-[var(--muted)]">Photos and stops land when the plan is ready.</p>
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
          Photos, stops, and tips appear after you chat with Voyara.
        </p>
      </div>
    );
  }

  const dir = textDirection(`${plan.title} ${plan.summary}`);
  const hero = resolveDestinationHero(plan.destination);

  return (
    <div className="space-y-4 p-1" dir={dir}>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="relative h-36 w-full">
          <Image
            src={hero.url}
            alt={plan.destination}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 320px"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
          <div className="absolute bottom-3 start-3 end-3 text-white">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/80">
              {plan.destination}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl leading-tight">
              {plan.title}
            </h2>
          </div>
        </div>
        <p className="px-3 py-2.5 text-sm text-[var(--muted)]">{plan.summary}</p>
      </div>

      <DestinationGallery destination={plan.destination} className="px-0.5" />

      {plan.days.map((day, dayIndex) => {
        const dayPhoto = resolvePlaceImage({
          dayTitle: day.title,
          destination: plan.destination,
          title: day.stops[0]?.title,
          address: day.stops[0]?.address,
        });

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
                alt={day.title || `Day ${day.dayNumber}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 start-3 flex items-center gap-2 text-white">
                <Badge className="bg-white/20 text-white backdrop-blur">Day {day.dayNumber}</Badge>
                <h3 className="text-sm font-medium">
                  {day.title || `Day ${day.dayNumber}`}
                </h3>
              </div>
            </div>

            <ol className="space-y-1 p-2">
              {day.stops.map((stop, stopIndex) => {
                const stopId = `${day.dayNumber}-${stopIndex}`;
                const stopDir = textDirection(stop.title);
                const photo = resolvePlaceImage({
                  title: stop.title,
                  address: stop.address,
                  category: stop.category,
                  destination: plan.destination,
                  dayTitle: day.title,
                });
                const isLoved = Boolean(loved[stopId]);

                return (
                  <li key={stopId}>
                    <div className="flex gap-2 rounded-xl p-1.5 transition hover:bg-[rgba(15,156,140,0.06)]">
                      <button
                        type="button"
                        dir={stopDir}
                        onClick={() => onStopClick?.(stopId, stop.title)}
                        className="flex min-w-0 flex-1 gap-2.5 text-start"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                          <Image
                            src={photo.url}
                            alt={stop.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-medium text-[var(--ink)]">
                              {stop.title}
                            </div>
                            {stop.estimatedCost != null && (
                              <span className="shrink-0 text-xs font-semibold text-[var(--accent-2)]">
                                {formatCurrency(stop.estimatedCost, stop.currency || "USD")}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted)]">
                            {stop.time && (
                              <span className="inline-flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {stop.time}
                              </span>
                            )}
                            {stop.category && (
                              <span className="uppercase tracking-wide text-[var(--accent)]">
                                {stop.category}
                              </span>
                            )}
                          </div>
                          {stop.address && (
                            <div className="mt-0.5 flex items-start gap-1 text-[11px] text-[var(--muted)]">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="line-clamp-1">{stop.address}</span>
                            </div>
                          )}
                          {stop.tips && (
                            <div className="mt-1 line-clamp-2 text-xs text-[var(--ink)]/80">
                              {stop.tips}
                            </div>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-label="Save stop"
                        onClick={() =>
                          setLoved((prev) => ({ ...prev, [stopId]: !prev[stopId] }))
                        }
                        className="mt-1 h-8 w-8 shrink-0 rounded-full border border-[var(--line)] bg-white grid place-items-center"
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            isLoved ? "fill-[var(--accent-2)] text-[var(--accent-2)]" : "text-[var(--muted)]"
                          }`}
                        />
                      </button>
                    </div>
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
