import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth-server";
import { JourneyMap } from "@/components/journey-map";
import { Button } from "@/components/ui/button";

export default async function HowItWorksPage() {
  const user = await getCurrentUser();

  return (
    <main className="app-shell min-h-screen">
      <SiteHeader role={user?.role} sticky />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:px-10">

        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          Stakeholder walkthrough
        </p>
        <h1 className="mt-2 max-w-3xl font-[family-name:var(--font-display)] text-4xl text-[var(--ink)] md:text-5xl">
          Voyara from A to Z — traveler, hotel, WhatsApp guest, admin
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          This is one loop. Plan in chat or WhatsApp. Confirm stay. Hotel runs SILA. Admin sees the
          live booking. Maps and photos are sent on WhatsApp so the guest never loses the “wow”.
        </p>

        <div className="mt-8">
          <JourneyMap />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="surface-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Screen A · Traveler
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Plan → pick hotel → confirm stay
            </h2>
            <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-[var(--muted)]">
              <li>
                Login → tap <strong className="text-[var(--ink)]">Traveler</strong> fill → Log in
              </li>
              <li>
                Open <strong className="text-[var(--ink)]">Planner</strong> — ask for a Jordan trip
              </li>
              <li>
                Tap <strong className="text-[var(--ink)]">Confirm hotel stay</strong> (or type احجز /
                BOOK in chat)
              </li>
              <li>
                Or WhatsApp Voyara a destination — it sends maps, photos, then reply{" "}
                <strong className="text-[var(--ink)]">احجز</strong>
              </li>
              <li>Hotel SILA + Admin Live ops update immediately</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/login">Login demos</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/planner">Open planner</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/listings">Hotels marketplace</Link>
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-white/95 p-6" id="guest">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Screen B · Hotel (Provider)
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              SILA Journey monitors the guest
            </h2>
            <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-[var(--muted)]">
              <li>
                Login → tap <strong className="text-[var(--ink)]">Provider</strong> → Log in
              </li>
              <li>
                Open tab <strong className="text-[var(--ink)]">SILA Journey</strong>
              </li>
              <li>
                Select the guest that just booked (source: Voyara booking)
              </li>
              <li>
                When guest replies <strong className="text-[var(--ink)]">2</strong> on WhatsApp, a
                request appears → tap <strong className="text-[var(--ink)]">Confirm</strong>
              </li>
              <li>
                Tap <strong className="text-[var(--ink)]">Next stage</strong> to move through the
                deck (check-in offers → mid-stay → late checkout → rating)
              </li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/provider">Open provider studio</Link>
              </Button>
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              What “reply 2” means
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Numbered WhatsApp menu
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Hotel messages look like this:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#0f243a] p-4 text-xs leading-relaxed text-[#7dede0]">
{`أهلاً… بنستناك بكرا
هل بدك:

1) استقبال من المطار
2) ترتيب جولة سياحية
3) تمام، شكراً

رد برقم الخيار`}
            </pre>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Guest sends <strong className="text-[var(--ink)]">2</strong> → hotel auto-replies
              “request received: city tour” → request shows in SILA → hotel Confirms.
            </p>
          </section>

          <section className="surface-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Screen C · Admin
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Platform monitor
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Approve hotels so they appear in traveler plans and listings. Charts show land → chat
              → trip intent. SILA ops live on the provider login — admin is the marketplace brain.
            </p>
            <Button asChild size="sm" className="mt-5">
              <Link href="/admin">Open admin</Link>
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
