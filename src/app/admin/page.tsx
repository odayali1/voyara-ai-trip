"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Analytics = {
  kpis: {
    travelers: number;
    trips: number;
    avgDays: number;
    providersPending: number;
    activeListings: number;
    luxurySeekers: number;
    foodieSeekers: number;
  };
  topDestinations: Array<{ name: string; value: number }>;
  travelerTypeMix: Array<{ name: string; value: number }>;
  topInterests: Array<{ name: string; value: number }>;
  funnel: {
    landed: number;
    preferences: number;
    chats: number;
    generated: number;
    listingViews: number;
  };
};

type ProviderRow = {
  id: string;
  businessName: string;
  status: string;
  city?: string | null;
  country?: string | null;
  user: { email: string; name: string };
  listings: unknown[];
};

const PIE_COLORS = ["#d4a574", "#7fadb8", "#f3ebe0", "#4f7f88"];

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);

  async function load() {
    const [aRes, pRes] = await Promise.all([
      fetch("/api/admin/analytics"),
      fetch("/api/admin/providers"),
    ]);
    if (aRes.status === 401 || aRes.status === 403) {
      window.location.href = "/login?next=/admin";
      return;
    }
    setAnalytics(await aRes.json());
    setProviders(await pRes.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch("/api/admin/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    toast.success(`Provider ${status.toLowerCase()}`);
    await load();
  }

  if (!analytics) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center text-[var(--muted)]">
        Loading admin intelligence…
      </main>
    );
  }

  const funnelData = [
    { name: "Land", value: analytics.funnel.landed },
    { name: "Prefer", value: analytics.funnel.preferences },
    { name: "Chat", value: analytics.funnel.chats },
    { name: "Generate", value: analytics.funnel.generated },
    { name: "Listings", value: analytics.funnel.listingViews },
  ];

  return (
    <main className="app-shell min-h-screen px-6 py-10 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="font-[family-name:var(--font-display)] text-3xl text-[var(--sand)]">
            Voyara
          </Link>
          <p className="mt-1 text-sm text-[var(--muted)]">Admin · intent & demand signals</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/planner">Open product</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Travelers", analytics.kpis.travelers],
          ["Trips", analytics.kpis.trips],
          ["Avg days / trip", analytics.kpis.avgDays],
          ["Pending providers", analytics.kpis.providersPending],
          ["Active listings", analytics.kpis.activeListings],
          ["Luxury seekers", analytics.kpis.luxurySeekers],
          ["Foodie seekers", analytics.kpis.foodieSeekers],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</div>
            <div className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--sand)]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 xl:col-span-1">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-[var(--muted)]">
            Traveler type mix
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.travelerTypeMix} dataKey="value" nameKey="name" outerRadius={90}>
                  {analytics.travelerTypeMix.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 xl:col-span-2">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-[var(--muted)]">
            Funnel · land → prefer → chat → generate
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid stroke="rgba(243,235,224,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#9bb0b6" />
                <YAxis stroke="#9bb0b6" />
                <Tooltip />
                <Bar dataKey="value" fill="#d4a574" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-[var(--muted)]">
            Top destinations
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topDestinations}>
                <CartesianGrid stroke="rgba(243,235,224,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#9bb0b6" />
                <YAxis stroke="#9bb0b6" />
                <Tooltip />
                <Bar dataKey="value" fill="#7fadb8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-[var(--muted)]">
            Interest signals
          </h2>
          <div className="space-y-2">
            {analytics.topInterests.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                <span>{item.name}</span>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            ))}
            {analytics.topInterests.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No interest signals yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl">Provider approvals</h2>
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--line)] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--sand)]">{p.businessName}</h3>
                  <Badge variant={p.status === "APPROVED" ? "success" : "warn"}>{p.status}</Badge>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {p.user.name} · {p.user.email}
                  {p.city ? ` · ${p.city}` : ""}
                  {p.country ? `, ${p.country}` : ""}
                  {` · ${p.listings.length} listings`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setStatus(p.id, "APPROVED")}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setStatus(p.id, "REJECTED")}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {providers.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No providers yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
