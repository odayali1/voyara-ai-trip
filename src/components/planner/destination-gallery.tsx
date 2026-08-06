"use client";

import Image from "next/image";
import { resolvePlaceImage, resolveDestinationHero } from "@/lib/place-images";

const GALLERY_KEYS = [
  "Petra treasury",
  "Wadi Rum desert",
  "Dead Sea float",
  "Amman citadel",
  "Aqaba red sea",
];

export function DestinationGallery({
  destination,
  className,
}: {
  destination?: string;
  className?: string;
}) {
  if (!destination) return null;

  const hero = resolveDestinationHero(destination);
  const shots = GALLERY_KEYS.map((key) =>
    resolvePlaceImage({ title: key, destination })
  );
  // Prefer destination-specific; if all fall back to same hero, still show variety by category
  const unique = [hero, ...shots].filter(
    (p, i, arr) => arr.findIndex((x) => x.url === p.url) === i
  );

  if (unique.length < 2) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Feel the destination
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {unique.slice(0, 5).map((photo) => (
          <div
            key={photo.url}
            className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-[var(--line)]"
          >
            <Image
              src={photo.url}
              alt={photo.credit}
              fill
              className="object-cover"
              sizes="112px"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}
