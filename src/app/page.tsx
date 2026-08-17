import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth-server";
import { LandingTracker } from "@/components/landing-tracker";
import { LandingPrompt } from "@/components/landing-prompt";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="relative min-h-screen overflow-hidden hero-grid">
      <LandingTracker />
      <SiteHeader role={user?.role} light />

      <section className="relative z-10 flex min-h-screen flex-col justify-end px-6 pb-16 pt-28 md:px-10 md:pb-24">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
            Plan · Stay · Hotel WhatsApp · Admin
          </p>
          <p className="mb-4 font-[family-name:var(--font-display)] text-5xl leading-[0.92] tracking-tight text-white md:text-7xl lg:text-8xl">
            Voyara
          </p>
          <h1 className="max-w-xl text-lg text-white/92 md:text-2xl">
            One loop: travelers plan trips, hotels run SILA stays on WhatsApp, admin watches demand.
          </h1>
          <LandingPrompt />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="hero">
              <Link href="/how-it-works">See A → Z walkthrough</Link>
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
