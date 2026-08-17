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
import { DashShell } from "@/components/dash/dash-shell";
import { Eyebrow, KpiCard, LiveDot, Segmented, Surface } from "@/components/ui/surface";
import {
  Building2,
  Compass,
  Hotel,
  MessageCircle,
  Percent,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react";

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
  liveOps?: {
    staysBooked: number;
    openRequests: number;
    stays: Array<{
      id: string;
      guestName: string;
      hotel: string;
      room: string;
      stage: string;
      source: string | null;
      channel: string;
      createdAt: string;
      openRequests: number;
    }>;
  };
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
  const [view, setView] = useState<"live" | "guests" | "intel" | "hotels">("live");
  const [resetBusy, setResetBusy] = useState(false);
  const [waGuests, setWaGuests] = useState<{
    count: number;
    guests: Array<{
      id: string;
      phone: string;
      displayName: string | null;
      language: string;
      travelerType: string | null;
      budgetBand: string | null;
      interests: string[];
      companions: string | null;
      homeCity: string | null;
      memorySummary: string | null;
      lastDestination: string | null;
      lastTripTitle: string | null;
      messageCount: number;
      lastSeenAt: string;
      trips: Array<{ title: string; destination: string; bookedAt: string | null }>;
      recentChat: Array<{ role: string; content: string }>;
    }>;
  } | null>(null);

  async function load() {
    const [aRes, pRes, gRes] = await Promise.all([
      fetch("/api/admin/analytics"),
      fetch("/api/admin/providers"),
      fetch("/api/admin/guests"),
    ]);
    if (aRes.status === 401 || aRes.status === 403) {
      window.location.href = "/login?next=/admin";
      return;
    }
    setAnalytics(await aRes.json());
    setProviders(await pRes.json());
    if (gRes.ok) setWaGuests(await gRes.json());
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

  async function resetWhatsApp(all = false) {
    setResetBusy(true);
    const res = await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : {}),
    });
    setResetBusy(false);
    if (!res.ok) {
      toast.error("Reset failed");
      return;
    }
    const data = await res.json();
    toast.success(`WhatsApp test wiped (${data.guests || 0} guests, ${data.trips || 0} trips)`);
    await load();
  }

  async function resetOne(phone: string) {
    setResetBusy(true);
    const res = await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setResetBusy(false);
    if (!res.ok) {
      toast.error("Reset failed");
      return;
    }
    toast.success(`Reset ${phone}`);
    await load();
  }

  if (!analytics) {
    return (
      <main className="dash-canvas flex min-h-screen items-center justify-center text-[var(--muted)]">
        <div className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 shadow-sm">
          <span className="live-dot" />
          Opening command center
        </div>
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

  return (
    <DashShell
      role="ADMIN"
      eyebrow="Owner command center"
      title="See demand, guests, and hotels in one glance"
      subtitle="Live stays, WhatsApp memory, conversion, and hotel approvals - the board view for Voyara."
      actions={
        <>
          <LiveDot />
          {analytics.sampleMode && <Badge variant="demo">Sample polish</Badge>}
          <Button
            variant="secondary"
            disabled={resetBusy}
            onClick={() => void resetWhatsApp(true)}
          >
            {resetBusy ? "Resetting…" : "Reset WhatsApp test"}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/how-it-works">Walkthrough</Link>
          </Button>
          <Button asChild>
            <Link href="/planner">Open product</Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Travelers" value={analytics.kpis.travelers} hint="Active accounts" icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Hotels" value={analytics.kpis.providers} hint={`${analytics.kpis.providersApproved} approved`} icon={<Building2 className="h-4 w-4" />} />
        <KpiCard label="Trips planned" value={analytics.kpis.trips} hint={`${analytics.kpis.avgDays} avg days`} icon={<Compass className="h-4 w-4" />} />
        <KpiCard label="Conversion" value={`${analytics.kpis.conversionRate}%`} hint="Land to trip" icon={<Percent className="h-4 w-4" />} />
        <KpiCard label="Live listings" value={analytics.kpis.activeListings} hint={`${analytics.kpis.totalListings} total`} icon={<Hotel className="h-4 w-4" />} />
        <KpiCard label="Pending review" value={analytics.kpis.providersPending} hint="Need approval" icon={<Sparkles className="h-4 w-4" />} />
        <KpiCard label="Foodie intent" value={analytics.kpis.foodieSeekers} hint="WhatsApp + web" icon={<Utensils className="h-4 w-4" />} />
        <KpiCard label="WhatsApp guests" value={waGuests?.count ?? 0} hint="Profiles from chat" icon={<MessageCircle className="h-4 w-4" />} />
      </div>

      <div className="mt-8">
        <Segmented
          value={view}
          onChange={setView}
          items={[
            { id: "live", label: "Live ops", count: analytics.liveOps?.staysBooked },
            { id: "guests", label: "WhatsApp CRM", count: waGuests?.count },
            { id: "intel", label: "Intelligence" },
            { id: "hotels", label: "Hotel desk", count: providers.length },
          ]}
        />
      </div>

      {view === "live" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-5">
          <Surface className="xl:col-span-3">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <Eyebrow>Live operations</Eyebrow>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                  Bookings that hit hotel + WhatsApp
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {analytics.liveOps?.staysBooked ?? 0} stays booked · {analytics.liveOps?.openRequests ?? 0} open guest requests
                </p>
              </div>
              <LiveDot label="Streaming" />
            </div>
            <div className="space-y-2">
              {(analytics.liveOps?.stays || []).length === 0 && (
                <p className="rounded-2xl bg-black/[0.03] px-4 py-6 text-sm text-[var(--muted)]">
                  No live stays yet. Plan a trip, then BOOK - or WhatsApp Voyara a destination.
                </p>
              )}
              {(analytics.liveOps?.stays || []).map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(145deg,#12b8a4,#ff8a4c)] text-sm font-bold text-white">
                      {s.guestName.slice(0, 1)}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{s.guestName}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {s.hotel} · {s.room}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{s.stage.replaceAll("_", " ")}</Badge>
                    <Badge variant="demo">{s.source || s.channel}</Badge>
                    {s.openRequests > 0 && <Badge variant="warn">{s.openRequests} requests</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Surface>
          <Surface className="xl:col-span-2">
            <Eyebrow>Show owners</Eyebrow>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              One loop, three desks
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
              <li className="rounded-2xl bg-black/[0.03] p-3">
                <strong className="text-[var(--ink)]">Demand.</strong> Travelers plan - charts show land, chat, trip.
              </li>
              <li className="rounded-2xl bg-black/[0.03] p-3">
                <strong className="text-[var(--ink)]">Supply.</strong> Approve hotels so rooms appear in plans.
              </li>
              <li className="rounded-2xl bg-black/[0.03] p-3">
                <strong className="text-[var(--ink)]">Stay ops.</strong> SILA WhatsApp on the hotel login.
              </li>
            </ul>
            <Button asChild className="mt-4" variant="secondary">
              <Link href="/provider">Open hotel desk</Link>
            </Button>
          </Surface>
        </div>
      )}

      {view === "guests" && (
        <Surface className="mt-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow>WhatsApp testers</Eyebrow>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                {waGuests?.count ?? 0} chats
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Temporary: reset a number so the next WhatsApp feels brand new. Or text RESET.
              </p>
            </div>
            <Button size="sm" variant="secondary" disabled={resetBusy} onClick={() => void resetWhatsApp(true)}>
              Reset all WhatsApp
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(waGuests?.guests || []).length === 0 && (
              <p className="text-sm text-[var(--muted)]">No WhatsApp travelers yet. Text the connected Voyara number.</p>
            )}
            {(waGuests?.guests || []).map((g) => (
              <article key={g.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-bold text-white">
                      {(g.displayName || "?").slice(0, 1)}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{g.displayName || g.phone}</p>
                      <p className="text-xs text-[var(--muted)]">{g.phone}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={resetBusy}
                    onClick={() => void resetOne(g.phone)}
                  >
                    Reset
                  </Button>
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {(g.interests || []).join(" · ") || "Interests learning"}
                  {g.companions ? ` · ${g.companions}` : ""}
                  {g.homeCity ? ` · from ${g.homeCity}` : ""}
                </p>
                {g.memorySummary && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">{g.memorySummary}</p>
                )}
                <p className="mt-3 text-[11px] text-[var(--muted)]">
                  Last trip: {g.lastTripTitle || "-"} ({g.lastDestination || "-"}) · {g.trips?.[0]?.bookedAt ? "booked" : "planning"}
                </p>
                {(g.recentChat || []).length > 0 && (
                  <div className="mt-3 space-y-1 rounded-2xl bg-[#f6f3ec] p-3 text-[11px] leading-relaxed">
                    {g.recentChat.map((m, i) => (
                      <p key={`${g.id}-c-${i}`}>
                        <span className="font-semibold">{m.role === "user" ? "Guest" : "Voyara"}:</span> {m.content}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </Surface>
      )}

      {view === "intel" && (
      <>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="surface-card p-5 xl:col-span-2">
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

        <section className="surface-card p-5">
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
        <section className="surface-card p-5">
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

        <section className="surface-card p-5">
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

        <section className="surface-card p-5">
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
        <section className="surface-card p-5">
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

        <section className="surface-card p-5">
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
        <section className="surface-card p-5">
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

        <section className="surface-card p-5">
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

        <section className="surface-card p-5">
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

      <section className="mt-6 surface-card p-5">
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
      </>
      )}
      {view === "hotels" && (
      <section className="mt-6 surface-card p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Eyebrow>Marketplace</Eyebrow>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Hotel approvals
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Approve a hotel and their rooms can appear in Voyara trip plans and listings.
            </p>
          </div>
          <Badge variant="outline">{providers.length} total</Badge>
        </div>
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white/80 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[var(--ink)]">{p.businessName}</h3>
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
      )}
    </DashShell>
  );
}
