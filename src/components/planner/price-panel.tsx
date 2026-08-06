"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { PriceOffer } from "@/lib/mock-prices";
import { Plane, Hotel } from "lucide-react";

export function PricePanel({
  flights,
  hotels,
}: {
  flights: PriceOffer[];
  hotels: PriceOffer[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Trip pricing
        </h3>
        <Badge variant="demo">Mock demo data</Badge>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Demo fares for the wow preview. Real partner APIs can plug in later.
      </p>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <Plane className="h-4 w-4 text-[var(--accent)]" />
          Flights
        </div>
        {flights.map((offer) => (
          <OfferRow key={offer.id} offer={offer} />
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <Hotel className="h-4 w-4 text-[var(--accent-2)]" />
          Stays
        </div>
        {hotels.map((offer) => (
          <OfferRow key={offer.id} offer={offer} />
        ))}
      </section>
    </div>
  );
}

function OfferRow({ offer }: { offer: PriceOffer }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[var(--ink)]">{offer.title}</div>
          <div className="text-xs text-[var(--muted)]">{offer.subtitle}</div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">{offer.meta}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-[var(--accent)]">
            {formatCurrency(offer.price, offer.currency)}
          </div>
          <Badge variant="demo" className="mt-1">
            Demo
          </Badge>
        </div>
      </div>
    </div>
  );
}
