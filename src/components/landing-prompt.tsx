"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const DESTINATIONS = ["Jordan", "Tokyo", "Lisbon", "Bali", "Dubai"];

export function LandingPrompt() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(q: string) {
    const query = q.trim();
    if (!query) {
      router.push("/planner");
      return;
    }
    router.push(`/planner?q=${encodeURIComponent(query)}&auto=1`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    go(value);
  }

  return (
    <div className="mt-8 w-full max-w-2xl space-y-4">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 rounded-[1.6rem] border border-white/25 bg-white/15 p-2 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="بدي اروح الأردن أشوف الطبيعة… or Plan 5 days in Jordan"
          className="h-12 flex-1 bg-transparent px-3 text-white placeholder:text-white/65 focus:outline-none"
          dir="auto"
        />
        <Button type="submit" size="lg" variant="hero" className="shrink-0">
          Explore
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {DESTINATIONS.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => go(city)}
            className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white/95 transition hover:bg-white/20"
          >
            {city}
          </button>
        ))}
      </div>
      <p className="text-xs text-white/75">
        No account needed. Write in Arabic or English — Voyara answers in your language.
      </p>
    </div>
  );
}
