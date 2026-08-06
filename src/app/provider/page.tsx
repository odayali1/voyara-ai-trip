"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Upload, FileSpreadsheet, Hotel, Compass, Utensils, Bus, Sparkles, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CHART, tooltipStyle } from "@/lib/chart-theme";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "HOTEL",
  "RESTAURANT",
  "TOUR",
  "ACTIVITY",
  "TRANSPORT",
  "EXPERIENCE",
] as const;

const BUSINESS_TYPES = [
  {
    id: "hotel",
    label: "Hotel / Stay",
    hint: "Rooms, resorts, camps, guesthouses",
    icon: Hotel,
    categories: ["HOTEL"] as const,
  },
  {
    id: "tour",
    label: "Tour & trips",
    hint: "Day tours, multi-day packages, guides",
    icon: Compass,
    categories: ["TOUR", "EXPERIENCE"] as const,
  },
  {
    id: "restaurant",
    label: "Restaurant",
    hint: "Dining, cafés, food experiences",
    icon: Utensils,
    categories: ["RESTAURANT"] as const,
  },
  {
    id: "local",
    label: "Local host",
    hint: "Experiences, workshops, cultural hosts",
    icon: Sparkles,
    categories: ["EXPERIENCE", "ACTIVITY"] as const,
  },
  {
    id: "transport",
    label: "Transport",
    hint: "Transfers, drivers, rentals",
    icon: Bus,
    categories: ["TRANSPORT"] as const,
  },
  {
    id: "activity",
    label: "Activities",
    hint: "Adventure, wellness, outdoor",
    icon: Bike,
    categories: ["ACTIVITY", "EXPERIENCE"] as const,
  },
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
  categories?: string[];
  listings: Listing[];
} | null;

type Analytics = {
  sampleMode?: boolean;
  kpis: {
    listings: number;
    active: number;
    views: number;
    saves: number;
    inquiries: number;
    avgPrice: number;
    conversion: number;
  };
  viewsSeries: Array<{ date: string; views: number; saves: number; inquiries: number }>;
  categoryMix: Array<{ name: string; value: number }>;
  cityMix: Array<{ name: string; value: number }>;
  topListings: Array<{ name: string; value: number; category: string; status: string }>;
  funnel: { impressions: number; views: number; saves: number; inquiries: number };
};

type Tab = "overview" | "catalog" | "profile";

export default function ProviderPage() {
  const [profile, setProfile] = useState<Profile>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [businessType, setBusinessType] = useState<string>("tour");
  const [importing, setImporting] = useState(false);
  const [listingCategory, setListingCategory] = useState<string>("TOUR");

  const selectedType = useMemo(
    () => BUSINESS_TYPES.find((t) => t.id === businessType) || BUSINESS_TYPES[1],
    [businessType]
  );

  async function load() {
    const [pRes, aRes] = await Promise.all([
      fetch("/api/providers"),
      fetch("/api/providers/analytics"),
    ]);
    if (pRes.status === 401) {
      window.location.href = "/login?next=/provider";
      return;
    }
    setProfile(await pRes.json());
    if (aRes.ok) setAnalytics(await aRes.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setListingCategory(selectedType.categories[0]);
  }, [selectedType]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const checked = CATEGORIES.filter((c) => form.get(`cat-${c}`));
    const categories =
      checked.length > 0 ? checked : [...selectedType.categories];
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
    toast.success("Provider profile saved");
    setTab("catalog");
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
        images: String(form.get("images") || "")
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
    toast.success("Listing published");
    e.currentTarget.reset();
    await load();
  }

  async function onImportFile(file: File | null) {
    if (!file) return;
    if (!profile) {
      toast.error("Save your business profile first");
      setTab("profile");
      return;
    }
    setImporting(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/providers/import", { method: "POST", body });
    setImporting(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Import failed");
      return;
    }
    const data = await res.json();
    toast.success(`Imported ${data.imported} services from file`);
    await load();
  }

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center text-[var(--muted)]">
        Loading provider studio…
      </main>
    );
  }

  const funnelData = analytics
    ? [
        { name: "Impressions", value: analytics.funnel.impressions },
        { name: "Views", value: analytics.funnel.views },
        { name: "Saves", value: analytics.funnel.saves },
        { name: "Inquiries", value: analytics.funnel.inquiries },
      ]
    : [];

  return (
    <main className="app-shell min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Provider studio
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] md:text-4xl">
            {profile?.businessName || "Grow with Voyara"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hotels, tour operators, restaurants, local hosts, transport — publish catalog,
            track demand, get discovered in AI trips.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile && (
            <Badge variant={profile.status === "APPROVED" ? "success" : "warn"}>
              {profile.status}
            </Badge>
          )}
          {analytics?.sampleMode && <Badge variant="demo">Sample analytics</Badge>}
          <Button asChild variant="secondary">
            <Link href="/planner">Planner</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1.5">
        {(
          [
            ["overview", "Overview & charts"],
            ["catalog", "Services & upload"],
            ["profile", "Business profile"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              tab === id
                ? "bg-[var(--accent)] text-white shadow"
                : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && analytics && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Listings", analytics.kpis.listings, `${analytics.kpis.active} active`],
              ["Views", analytics.kpis.views, "Last 14 days"],
              ["Saves", analytics.kpis.saves, "Traveler saves"],
              ["Inquiries", analytics.kpis.inquiries, `${analytics.kpis.conversion}% convert`],
            ].map(([label, value, hint]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {label}
                </div>
                <div className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                  {value}
                </div>
                <div className="text-xs text-[var(--muted)]">{hint}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 xl:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Demand over time</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.viewsSeries}>
                    <defs>
                      <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.teal} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="date" stroke={CHART.muted} fontSize={11} />
                    <YAxis stroke={CHART.muted} fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Area type="monotone" dataKey="views" stroke={CHART.teal} fill="url(#pv)" strokeWidth={2} />
                    <Area type="monotone" dataKey="saves" stroke={CHART.coral} fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="inquiries" stroke={CHART.sky} fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Catalog mix</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        analytics.categoryMix.length
                          ? analytics.categoryMix
                          : [{ name: "Empty", value: 1 }]
                      }
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                    >
                      {(analytics.categoryMix.length
                        ? analytics.categoryMix
                        : [{ name: "Empty", value: 1 }]
                      ).map((_, i) => (
                        <Cell key={i} fill={CHART.series[i % CHART.series.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Performance funnel</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="name" stroke={CHART.muted} fontSize={11} />
                    <YAxis stroke={CHART.muted} fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill={CHART.coral} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Top listings</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.topListings}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" stroke={CHART.muted} fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      stroke={CHART.muted}
                      fontSize={10}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill={CHART.teal} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "catalog" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              What kind of provider are you?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Pick a type — Voyara adapts the catalog form. You can still offer multiple categories.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {BUSINESS_TYPES.map((type) => {
                const Icon = type.icon;
                const active = businessType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setBusinessType(type.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-[var(--accent)] bg-[rgba(15,156,140,0.08)] shadow"
                        : "border-[var(--line)] bg-white/60 hover:border-[var(--accent)]/40"
                    )}
                  >
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                    <div className="mt-2 font-medium text-[var(--ink)]">{type.label}</div>
                    <div className="text-xs text-[var(--muted)]">{type.hint}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-dashed border-[var(--accent)]/40 bg-[rgba(15,156,140,0.06)] p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2 shadow-sm">
                  <Upload className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                    Upload catalog file
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Drop a CSV or JSON of rooms, tours, restaurants, activities — no need to type
                    every row by hand.
                  </p>
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white/80 px-4 py-10 text-center transition hover:border-[var(--accent)]">
                <FileSpreadsheet className="mb-2 h-8 w-8 text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--ink)]">
                  {importing ? "Importing…" : "Choose CSV / JSON file"}
                </span>
                <span className="mt-1 text-xs text-[var(--muted)]">
                  Columns: title, category, city, country, priceFrom, tags…
                </span>
                <input
                  type="file"
                  accept=".csv,.json,.txt,text/csv,application/json"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => void onImportFile(e.target.files?.[0] || null)}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <a href="/samples/provider-catalog-sample.csv" download>
                    Download sample CSV
                  </a>
                </Button>
                <Badge variant="outline">Max 40 rows / upload</Badge>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Or add one manually
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tuned for {selectedType.label.toLowerCase()}.
              </p>
              <form onSubmit={addListing} className="mt-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="title">
                    {businessType === "hotel" ? "Room / property name" : "Title"}
                  </Label>
                  <Input id="title" name="title" required placeholder="Petra Sunrise Tour" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    value={listingCategory}
                    onChange={(e) => setListingCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-[var(--line)] bg-white px-3 text-sm"
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
                  <Textarea id="listing-description" name="description" required rows={3} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="listing-city">City</Label>
                    <Input id="listing-city" name="city" required defaultValue={profile?.city || ""} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="listing-country">Country</Label>
                    <Input
                      id="listing-country"
                      name="country"
                      required
                      defaultValue={profile?.country || ""}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="priceFrom">Price from</Label>
                    <Input id="priceFrom" name="priceFrom" type="number" min="0" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tags">Tags</Label>
                    <Input id="tags" name="tags" placeholder="family, desert, food" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="images">Image URLs (optional)</Label>
                  <Input
                    id="images"
                    name="images"
                    placeholder="https://… , https://…"
                  />
                </div>
                <Button type="submit" disabled={!profile}>
                  Publish listing
                </Button>
                {!profile && (
                  <p className="text-xs text-[var(--muted)]">
                    Save a business profile first in the Profile tab.
                  </p>
                )}
              </form>
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                Your catalog
              </h2>
              <Badge variant="outline">{profile?.listings.length || 0} items</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(profile?.listings || []).map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-xl border border-[var(--line)] bg-white/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{listing.category.toLowerCase()}</Badge>
                    <Badge variant="outline">{listing.status.toLowerCase()}</Badge>
                  </div>
                  <h3 className="mt-2 text-lg text-[var(--ink)]">{listing.title}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {listing.city}, {listing.country}
                    {listing.priceFrom != null ? ` · from $${listing.priceFrom}` : ""}
                  </p>
                </div>
              ))}
              {profile && profile.listings.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  No listings yet — upload a CSV or add one manually.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "profile" && (
        <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Business profile
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Hotels, tour companies, restaurants, local guides — all welcome.
          </p>
          <form onSubmit={saveProfile} className="mt-4 space-y-3">
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
              <Textarea
                id="description"
                name="description"
                placeholder="Who you are and what travelers love about you"
              />
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
              <Label>Categories you offer</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs text-[var(--ink)]"
                  >
                    <input
                      type="checkbox"
                      name={`cat-${c}`}
                      defaultChecked={
                        profile?.categories?.includes(c) ||
                        (selectedType.categories as readonly string[]).includes(c)
                      }
                    />
                    {c.toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </section>
      )}
    </main>
  );
}
