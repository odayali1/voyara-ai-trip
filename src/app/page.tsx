import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth-server";
import { LandingTracker } from "@/components/landing-tracker";
import { LandingPrompt } from "@/components/landing-prompt";

const CHIPS = ["Plan a trip", "Confirm a stay", "Hotel WhatsApp", "Owner command center"];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="relative min-h-screen overflow-hidden hero-grid">
      <LandingTracker />
      <div className="hero-veil absolute inset-0" />
      <SiteHeader role={user?.role} light />

      <section className="relative z-10 flex min-h-screen flex-col justify-end px-6 pb-16 pt-28 md:px-10 md:pb-24">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-md"
              >
                {chip}
              </span>
            ))}
          </div>
          <p className="mb-4 font-[family-name:var(--font-display)] text-5xl leading-[0.9] tracking-tight text-white md:text-7xl lg:text-8xl">
            Voyara
          </p>
          <h1 className="max-w-xl text-lg text-white/92 md:text-2xl">
            The travel friend that plans, books, and stays with the guest - from first WhatsApp to the hotel desk.
          </h1>
          <LandingPrompt />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="hero">
              <Link href="/how-it-works">See A to Z walkthrough</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
              <Link href="/planner">Start planning</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
              <Link href="/listings">Confirm a hotel stay</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
