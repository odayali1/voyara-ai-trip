import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ListingViewTracker } from "@/components/listing-view-tracker";
import { StartStayButton } from "@/components/start-stay-button";
import { JourneyMap } from "@/components/journey-map";

export default async function ListingsPage() {
  const user = await getCurrentUser();
  const listings = await db.providerListing.findMany({
    where: { status: "ACTIVE", provider: { status: "APPROVED" } },
    include: { provider: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="app-shell min-h-screen">
      <SiteHeader role={user?.role} sticky />
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-8 md:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          Marketplace
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)] md:text-5xl">
          Hotels & partners
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Pick a stay. Confirm. The hotel SILA desk and admin live ops update immediately.
        </p>

        <div className="mt-6">
          <JourneyMap compact highlight={2} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <article
              key={listing.id}
              className="surface-card flex flex-col p-5 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(12,28,46,0.1)]"
            >
              <ListingViewTracker
                listingId={listing.id}
                category={listing.category}
                city={listing.city}
              />
              <div className="flex items-center justify-between gap-2">
                <Badge>{listing.category.toLowerCase()}</Badge>
                {listing.priceFrom != null && (
                  <span className="text-sm text-[var(--accent)]">
                    from {formatCurrency(listing.priceFrom, listing.currency)}
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">
                {listing.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {listing.city}, {listing.country} · {listing.provider.businessName}
              </p>
              <p className="mt-3 flex-1 text-sm text-[var(--sand)]/90">{listing.description}</p>
              {listing.category === "HOTEL" ? (
                <StartStayButton listingId={listing.id} hotelOnly />
              ) : (
                <p className="mt-4 text-xs text-[var(--muted)]">
                  Experience listing — appears inside AI trip plans. Hotel stays use HOTEL cards.
                </p>
              )}
            </article>
          ))}
          {listings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-[var(--muted)] md:col-span-2">
              No approved listings yet.{" "}
              <Link href="/provider" className="text-[var(--accent)]">
                Become a provider
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
