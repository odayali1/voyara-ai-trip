"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Upload, ShieldAlert, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "1 · Hotel profile",
    body: "Save your hotel name & city so Voyara can recommend you in trip plans.",
    icon: BedDouble,
  },
  {
    title: "2 · AI import rooms",
    body: "Upload PDF, Word, or Excel rate sheets — AI fills room cards. No manual typing.",
    icon: Upload,
  },
  {
    title: "3 · Silent Guest Shield",
    body: "Send a mid-stay pulse before checkout. Catch issues privately — avoid surprise bad reviews.",
    icon: ShieldAlert,
  },
];

export function ProviderTour({ onJump }: { onJump?: (tab: string) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("voyara_hotel_tour_v1") !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem("voyara_hotel_tour_v1", "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
        Show hotel tour / examples
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-3xl border border-[var(--accent)]/25 bg-[linear-gradient(135deg,#fffaf3,#e7f7f3)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Quick tour
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Hotel provider in 3 moves
          </h2>
        </div>
        <button type="button" onClick={dismiss} aria-label="Close tour">
          <X className="h-5 w-5 text-[var(--muted)]" />
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.title} className="rounded-2xl border border-white/80 bg-white/80 p-4">
            <step.icon className="h-5 w-5 text-[var(--accent)]" />
            <h3 className="mt-2 text-sm font-semibold text-[var(--ink)]">{step.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{step.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            onJump?.("ai");
            dismiss();
          }}
        >
          Try AI import example
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onJump?.("pulse");
            dismiss();
          }}
        >
          Open Silent Guest Shield
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
