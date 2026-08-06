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
      <SiteHeader role={user?.role} />

      <section className="relative z-10 flex min-h-screen flex-col justify-end px-6 pb-16 pt-28 md:px-10 md:pb-24">
        <div className="max-w-3xl">
          <p className="mb-4 font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-[var(--sand)] md:text-7xl lg:text-8xl">
            Voyara
          </p>
          <h1 className="max-w-xl text-lg text-[var(--sand)]/90 md:text-2xl">
            Your AI fixer for places, journeys, and plans — mapped as you chat.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-[var(--muted)] md:text-base">
            Chat first. Watch a day-by-day itinerary light up the map. No login required to start.
          </p>
          <LandingPrompt />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/listings">Browse providers</Link>
            </Button>
            {!user && (
              <Button asChild size="lg" variant="ghost">
                <Link href="/signup">Create account</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
