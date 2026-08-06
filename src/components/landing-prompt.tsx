"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const DESTINATIONS = [
  "Tokyo",
  "Lisbon",
  "Bali",
  "Paris",
  "Dubai",
  "New York",
  "Rome",
  "Bangkok",
];

export function LandingPrompt() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(q: string) {
    const query = q.trim();
    if (!query) {
      router.push("/planner");
      return;
    }
    router.push(`/planner?q=${encodeURIComponent(query)}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    go(value);
  }

  return (
    <div className="mt-8 w-full max-w-xl space-y-4">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/35 p-2 backdrop-blur sm:flex-row sm:items-center"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Plan a trip to Tokyo for a couple…"
          className="h-12 flex-1 bg-transparent px-3 text-[var(--sand)] placeholder:text-[var(--muted)] focus:outline-none"
        />
        <Button type="submit" size="lg" className="shrink-0">
          Explore
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {DESTINATIONS.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => go(city)}
            className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-[var(--sand)]/90 transition hover:border-[var(--accent)]"
          >
            {city}
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]">
        No account needed to start. Save & share when you are ready.
      </p>
    </div>
  );
}
