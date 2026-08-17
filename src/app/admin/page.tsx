"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHART, tooltipStyle } from "@/lib/chart-theme";
import { toast } from "sonner";

type Analytics = {
  sampleMode?: boolean;
  kpis: {
    travelers: number;
    providers: number;
    admins: number;
    trips: number;
    avgDays: number;
    providersPending: number;
    providersApproved: number;
    providersRejected: number;
    activeListings: number;
    totalListings: number;
    luxurySeekers: number;
    foodieSeekers: number;
    adventureSeekers: number;
    cultureSeekers: number;
    conversionRate: number;
  };
  topDestinations: Array<{ name: string; value: number }>;
  travelerTypeMix: Array<{ name: string; value: number }>;
  intentFlags: Array<{ name: string; value: number }>;
  topInterests: Array<{ name: string; value: number }>;
  funnel: {
    landed: number;
    preferences: number;
    chats: number;
    generated: number;
    listingViews: number;
    mapOpens: number;
    stops: number;
  };
  eventBreakdown: Array<{ name: string; value: number }>;
  providerCategoryStack: Array<{ name: string; value: number }>;
  providerCityStack: Array<{ name: string; value: number }>;
  listingStatus: Array<{ name: string; value: number }>;
  activitySeries: Array<{
    date: string;
    landed: number;
    chats: number;
    trips: number;
    listingViews: number;
  }>;
  userGrowth: Array<{ date: string; travelers: number; providers: number }>;
  budgetMix: Array<{ name: string; value: number }>;
  roleMix: Array<{ name: string; value: number }>;
};

type ProviderRow = {
  id: string;
  businessName: string;
  status: string;
  city?: string | null;
  country?: string | null;
  categories?: string[];
  user: { email: string; name: string };
  listings: unknown[];
};

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
        Loading command center…
      </main>
    );
  }

  const funnelData = [
    { name: "Land", value: analytics.funnel.landed },
    { name: "Prefer", value: analytics.funnel.preferences },
    { name: "Chat", value: analytics.funnel.chats },
    { name: "Generate", value: analytics.funnel.generated },
    { name: "Map", value: analytics.funnel.mapOpens },
    { name: "Listings", value: analytics.funnel.listingViews },
  ];

  const kpis: Array<[string, string | number, string]> = [
    ["Travelers", analytics.kpis.travelers, "Active accounts"],
    ["Providers", analytics.kpis.providers, `${analytics.kpis.providersApproved} approved`],
    ["Trips planned", analytics.kpis.trips, `${analytics.kpis.avgDays} avg days`],
    ["Conversion", `${analytics.kpis.conversionRate}%`, "Land → trip"],
    ["Active listings", analytics.kpis.activeListings, `${analytics.kpis.totalListings} total`],
    ["Pending review", analytics.kpis.providersPending, "Need approval"],
    ["Foodie intent", analytics.kpis.foodieSeekers, "Intent signals"],
    ["Adventure intent", analytics.kpis.adventureSeekers, "Intent signals"],
  ];

  return (
    <main className="app-shell min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Admin intelligence
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] md:text-4xl">
            Voyara command center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Platform brain for stakeholders: who lands, who chats, who books intent, and which hotels
            supply rooms. Approve providers so they appear in traveler trip plans.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analytics.sampleMode && <Badge variant="demo">Includes sample polish</Badge>}
          <Button asChild variant="secondary">
            <Link href="/planner">Open product</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--accent)]/20 bg-[linear-gradient(135deg,#fffdf8,#f3faf8)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Explain to stakeholders · Admin
        </p>
        <ul className="mt-2 grid gap-2 text-xs leading-relaxed text-[var(--muted)] md:grid-cols-3">
          <li>
            <strong className="text-[var(--ink)]">Demand:</strong> travelers plan trips — charts
            show land → chat → trip intent.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Supply:</strong> approve hotels so rooms appear in
            listings + AI plans.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Stay ops:</strong> SILA WhatsApp lives on Provider
            login — see{" "}
            <a href="/how-it-works" className="font-semibold text-[var(--accent)]">
              How it works A→Z
            </a>
            .
          </li>
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, hint]) => (
          <div
            key={label}
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_10px_30px_rgba(15,36,58,0.04)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {label}
            </div>
            <div className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
              {value}
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Behavior over time</h2>
            <Badge variant="outline">14 days</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.activitySeries}>
                <defs>
                  <linearGradient id="gLand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.teal} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART.teal} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gChat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.coral} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART.coral} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" stroke={CHART.muted} fontSize={11} />
                <YAxis stroke={CHART.muted} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="landed"
                  stroke={CHART.teal}
                  fill="url(#gLand)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stroke={CHART.coral}
                  fill="url(#gChat)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="trips"
                  stroke={CHART.sky}
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Traveler type mix</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.travelerTypeMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {analytics.travelerTypeMix.map((_, i) => (
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Conversion funnel</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" stroke={CHART.muted} fontSize={11} />
                <YAxis stroke={CHART.muted} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={CHART.teal} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Top destinations</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topDestinations} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" stroke={CHART.muted} fontSize={11} />
                <YAxis type="category" dataKey="name" stroke={CHART.muted} fontSize={11} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={CHART.coral} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Intent radar</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={analytics.intentFlags}>
                <PolarGrid stroke={CHART.grid} />
                <PolarAngleAxis dataKey="name" tick={{ fill: CHART.muted, fontSize: 11 }} />
                <Radar
                  dataKey="value"
                  stroke={CHART.teal}
                  fill={CHART.teal}
                  fillOpacity={0.35}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">User growth</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.userGrowth}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" stroke={CHART.muted} fontSize={11} />
                <YAxis stroke={CHART.muted} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="travelers" stroke={CHART.teal} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="providers" stroke={CHART.coral} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Provider supply stack</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.providerCategoryStack}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" stroke={CHART.muted} fontSize={11} />
                <YAxis stroke={CHART.muted} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {analytics.providerCategoryStack.map((_, i) => (
                    <Cell key={i} fill={CHART.series[i % CHART.series.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Listings by city</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.providerCityStack}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" stroke={CHART.muted} fontSize={10} />
                <YAxis stroke={CHART.muted} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={CHART.sky} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Budget intent</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.budgetMix} dataKey="value" nameKey="name" outerRadius={80}>
                  {analytics.budgetMix.map((_, i) => (
                    <Cell key={i} fill={CHART.series[i % CHART.series.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Interest signals</h2>
          <div className="space-y-2">
            {analytics.topInterests.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
              >
                <span className="capitalize text-[var(--ink)]">{item.name}</span>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">All behavior event counts</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.eventBreakdown}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" stroke={CHART.muted} fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke={CHART.muted} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={CHART.gold} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Provider approvals
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Approve a hotel → their rooms can surface in Voyara trip plans and listings.
            </p>
          </div>
          <Badge variant="outline">{providers.length} total</Badge>
        </div>
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-white/70 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-[var(--ink)]">{p.businessName}</h3>
                  <Badge variant={p.status === "APPROVED" ? "success" : "warn"}>{p.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
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
