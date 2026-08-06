import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ListingViewTracker } from "@/components/listing-view-tracker";

export default async function ListingsPage() {
  const user = await getCurrentUser();
  const listings = await db.providerListing.findMany({
    where: { status: "ACTIVE", provider: { status: "APPROVED" } },
    include: { provider: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="app-shell min-h-screen">
      <div className="relative px-6 pb-16 pt-24 md:px-10">
        <SiteHeader role={user?.role} />
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--sand)]">
          Provider marketplace
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          Hotels, tours, restaurants, transport, and experiences from Voyara partners.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <article
              key={listing.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"
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
              <p className="mt-3 text-sm text-[var(--sand)]/90">{listing.description}</p>
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
