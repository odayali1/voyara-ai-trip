"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const TYPES = ["SOLO", "COUPLE", "FAMILY", "FRIENDS"] as const;
const BUDGETS = ["BUDGET", "MID", "LUXURY"] as const;
const INTERESTS = [
  "food",
  "culture",
  "adventure",
  "nightlife",
  "nature",
  "shopping",
  "history",
  "wellness",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [travelerType, setTravelerType] = useState<(typeof TYPES)[number]>("COUPLE");
  const [budgetBand, setBudgetBand] = useState<(typeof BUDGETS)[number]>("MID");
  const [interests, setInterests] = useState<string[]>(["food", "culture"]);
  const [homeCity, setHomeCity] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleInterest(item: string) {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  async function save() {
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travelerType, budgetBand, interests, homeCity }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not save preferences");
      return;
    }
    router.push("/planner");
  }

  return (
    <main className="app-shell min-h-screen px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--sand)]">
          How do you travel?
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          A few signals so Voyara plans like someone who already knows you.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-[var(--muted)]">Traveler type</h2>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button
                key={t}
                type="button"
                variant={travelerType === t ? "default" : "secondary"}
                onClick={() => setTravelerType(t)}
              >
                {t.toLowerCase()}
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-[var(--muted)]">Budget</h2>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Button
                key={b}
                type="button"
                variant={budgetBand === b ? "default" : "secondary"}
                onClick={() => setBudgetBand(b)}
              >
                {b.toLowerCase()}
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-[var(--muted)]">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((item) => (
              <Button
                key={item}
                type="button"
                variant={interests.includes(item) ? "default" : "secondary"}
                onClick={() => toggleInterest(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-[var(--muted)]">Home city</h2>
          <Input
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
            placeholder="e.g. New York"
          />
        </section>

        <Button className="mt-10" size="lg" onClick={save} disabled={loading}>
          {loading ? "Saving…" : "Enter planner"}
        </Button>
      </div>
    </main>
  );
}
