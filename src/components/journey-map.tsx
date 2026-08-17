import Link from "next/link";
import { cn } from "@/lib/utils";

export const JOURNEY_STEPS = [
  {
    n: "1",
    title: "Traveler plans",
    body: "Chat with Voyara AI → trip plan on the map → save the trip.",
    href: "/planner",
    role: "Traveler",
  },
  {
    n: "2",
    title: "Pick a hotel",
    body: "Browse partner hotels/experiences. Confirm stay (demo booking).",
    href: "/listings",
    role: "Traveler",
  },
  {
    n: "3",
    title: "Hotel runs SILA",
    body: "Provider opens SILA Journey and sends WhatsApp stages to the guest.",
    href: "/provider",
    role: "Provider",
  },
  {
    n: "4",
    title: "Guest replies",
    body: "Guest answers 1 / 2 / 3 on WhatsApp (or web chat). Hotel confirms requests.",
    href: "/how-it-works#guest",
    role: "Guest",
  },
  {
    n: "5",
    title: "Admin watches",
    body: "Command center: demand, supply, approve hotels so they appear in plans.",
    href: "/admin",
    role: "Admin",
  },
] as const;

export function JourneyMap({
  compact = false,
  highlight,
  className,
}: {
  compact?: boolean;
  highlight?: number;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-[var(--line)] bg-white/90 p-4 shadow-sm md:p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Voyara A → Z
          </p>
          <h2
            className={cn(
              "font-[family-name:var(--font-display)] text-[var(--ink)]",
              compact ? "text-xl" : "text-2xl md:text-3xl"
            )}
          >
            One product loop — traveler, hotel, guest, admin
          </h2>
        </div>
        <Link
          href="/how-it-works"
          className="text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          Full walkthrough →
        </Link>
      </div>
      <div
        className={cn(
          "mt-4 grid gap-2",
          compact ? "md:grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-5"
        )}
      >
        {JOURNEY_STEPS.map((step, i) => (
          <Link
            key={step.n}
            href={step.href}
            className={cn(
              "rounded-2xl border p-3 transition hover:border-[var(--accent)]",
              highlight === i + 1
                ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,white)]"
                : "border-[var(--line)] bg-[var(--panel-solid)]"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-white">
                {step.n}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {step.role}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-[var(--ink)]">{step.title}</h3>
            {!compact && (
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{step.body}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
