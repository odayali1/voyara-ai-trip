"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CATEGORIES = [
  "HOTEL",
  "RESTAURANT",
  "TOUR",
  "ACTIVITY",
  "TRANSPORT",
  "EXPERIENCE",
] as const;

type Listing = {
  id: string;
  title: string;
  category: string;
  city: string;
  country: string;
  description: string;
  priceFrom: number | null;
  status: string;
};

type Profile = {
  id: string;
  businessName: string;
  status: string;
  city?: string | null;
  country?: string | null;
  listings: Listing[];
} | null;

export default function ProviderPage() {
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/providers");
    if (res.status === 401) {
      window.location.href = "/login?next=/provider";
      return;
    }
    const data = await res.json();
    setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const categories = CATEGORIES.filter((c) => form.get(`cat-${c}`));
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: form.get("businessName"),
        description: form.get("description"),
        city: form.get("city"),
        country: form.get("country"),
        website: form.get("website"),
        phone: form.get("phone"),
        categories,
      }),
    });
    if (!res.ok) {
      toast.error("Could not save provider profile");
      return;
    }
    toast.success("Provider profile saved — awaiting admin approval if new");
    await load();
  }

  async function addListing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/providers/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        category: form.get("category"),
        description: form.get("description"),
        city: form.get("city"),
        country: form.get("country"),
        priceFrom: form.get("priceFrom") ? Number(form.get("priceFrom")) : null,
        tags: String(form.get("tags") || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: "ACTIVE",
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Could not create listing");
      return;
    }
    toast.success("Listing added");
    e.currentTarget.reset();
    await load();
  }

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center text-[var(--muted)]">
        Loading provider portal…
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen px-6 py-10 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="font-[family-name:var(--font-display)] text-3xl text-[var(--sand)]">
            Voyara
          </Link>
          <p className="mt-1 text-sm text-[var(--muted)]">Provider portal</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/planner">Back to planner</Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <div className="mb-4 flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-2xl">Business profile</h1>
            {profile && <Badge variant={profile.status === "APPROVED" ? "success" : "warn"}>{profile.status}</Badge>}
          </div>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                name="businessName"
                required
                defaultValue={profile?.businessName || ""}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={profile?.city || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue={profile?.country || ""} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
            </div>
            <div>
              <Label>Categories</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-xs text-[var(--sand)]">
                    <input type="checkbox" name={`cat-${c}`} />
                    {c.toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Add listing</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hotels, tours, restaurants, transport, activities, experiences.
          </p>
          <form onSubmit={addListing} className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                className="flex h-10 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-sm"
                defaultValue="HOTEL"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="listing-description">Description</Label>
              <Textarea id="listing-description" name="description" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="listing-city">City</Label>
                <Input id="listing-city" name="city" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="listing-country">Country</Label>
                <Input id="listing-country" name="country" required />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="priceFrom">Price from</Label>
                <Input id="priceFrom" name="priceFrom" type="number" min="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" name="tags" placeholder="family, rooftop, vegan" />
              </div>
            </div>
            <Button type="submit" disabled={!profile}>
              Publish listing
            </Button>
          </form>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Your listings</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(profile?.listings || []).map((listing) => (
            <div key={listing.id} className="rounded-xl border border-[var(--line)] p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge>{listing.category.toLowerCase()}</Badge>
                <Badge variant="outline">{listing.status.toLowerCase()}</Badge>
              </div>
              <h3 className="mt-2 text-lg text-[var(--sand)]">{listing.title}</h3>
              <p className="text-sm text-[var(--muted)]">
                {listing.city}, {listing.country}
              </p>
            </div>
          ))}
          {profile && profile.listings.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No listings yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
