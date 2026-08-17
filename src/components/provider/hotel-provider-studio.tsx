"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BedDouble,
  Sparkles,
  Upload,
  FileText,
  Eye,
  Heart,
  MessageSquare,
  DollarSign,
  Check,
  Loader2,
  Hotel,
  Wand2,
  LayoutDashboard,
  MessageCircle,
  HeartPulse,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CHART, tooltipStyle } from "@/lib/chart-theme";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ProviderTour } from "@/components/provider/provider-tour";
import { GuestPulsePanel } from "@/components/provider/guest-pulse-panel";
import { ConciergeJourneyPanel } from "@/components/provider/concierge-journey-panel";
import { JourneyMap } from "@/components/journey-map";
import { SiteHeader } from "@/components/site-header";
import { Eyebrow, KpiCard, LiveDot, Surface } from "@/components/ui/surface";

type Listing = {
  id: string;
  title: string;
  category: string;
  city: string;
  country: string;
  description: string;
  priceFrom: number | null;
  status: string;
  amenities?: string[];
  tags?: string[];
  images?: string[];
};

type Profile = {
  id: string;
  businessName: string;
  status: string;
  city?: string | null;
  country?: string | null;
  description?: string | null;
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
};

type RoomDraft = {
  title: string;
  description: string;
  city?: string;
  country?: string;
  priceFrom?: number | null;
  currency?: string;
  tags?: string[];
  amenities?: string[];
  bedType?: string;
  capacity?: number;
  category?: string;
};

type Tab = "overview" | "rooms" | "ai" | "concierge" | "pulse" | "profile";

const ROOM_IMAGES = [
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
];

type Arrival = {
  stayId: string;
  firstName: string;
  phoneMasked: string;
  room: string;
  stage: string;
  checkIn: string;
  checkOut: string;
  source: string | null;
  tripCity: string | null;
  vibe: string[];
  travelerType: string | null;
  openRequests: string[];
};

export function HotelProviderStudio() {
  const [profile, setProfile] = useState<Profile>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [aiBusy, setAiBusy] = useState(false);
  const [drafts, setDrafts] = useState<RoomDraft[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [pasteText, setPasteText] = useState("");

  const hotelListings = useMemo(
    () => (profile?.listings || []).filter((l) => l.category === "HOTEL"),
    [profile]
  );

  async function load() {
    const [pRes, aRes, arrRes] = await Promise.all([
      fetch("/api/providers"),
      fetch("/api/providers/analytics"),
      fetch("/api/providers/arrivals"),
    ]);
    if (pRes.status === 401) {
      window.location.href = "/login?next=/provider";
      return;
    }
    setProfile(await pRes.json());
    if (aRes.ok) setAnalytics(await aRes.json());
    if (arrRes.ok) {
      const data = await arrRes.json();
      setArrivals(data.arrivals || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
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
        categories: ["HOTEL"],
      }),
    });
    if (!res.ok) {
      toast.error("Could not save hotel profile");
      return;
    }
    toast.success("Hotel profile saved");
    setTab("ai");
    await load();
  }

  async function addRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/providers/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        category: "HOTEL",
        description: form.get("description"),
        city: form.get("city") || profile?.city,
        country: form.get("country") || profile?.country,
        priceFrom: form.get("priceFrom") ? Number(form.get("priceFrom")) : null,
        tags: String(form.get("tags") || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        amenities: String(form.get("amenities") || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: "ACTIVE",
      }),
    });
    if (!res.ok) {
      toast.error("Could not publish room");
      return;
    }
    toast.success("Room published");
    e.currentTarget.reset();
    await load();
  }

  async function runAiImport(file?: File | null) {
    if (!profile) {
      toast.error("Save your hotel profile first");
      setTab("profile");
      return;
    }
    if (!file && pasteText.trim().length < 40) {
      toast.error("Upload a PDF/Word file or paste your rate sheet");
      return;
    }
    setAiBusy(true);
    const body = new FormData();
    if (file) body.append("file", file);
    if (pasteText.trim()) body.append("text", pasteText);
    body.append("publish", "0");

    const res = await fetch("/api/providers/ai-import", { method: "POST", body });
    setAiBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "AI import failed");
      return;
    }
    const data = await res.json();
    setDrafts(data.rooms || []);
    setSelected(
      Object.fromEntries((data.rooms || []).map((_: RoomDraft, i: number) => [i, true]))
    );
    toast.success(`AI found ${data.rooms?.length || 0} rooms — review & publish`);
    setTab("ai");
  }

  async function publishSelected() {
    const rooms = drafts.filter((_, i) => selected[i]);
    if (rooms.length === 0) {
      toast.message("Select at least one room");
      return;
    }
    setAiBusy(true);
    let ok = 0;
    for (const room of rooms) {
      const res = await fetch("/api/providers/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: room.title,
          category: "HOTEL",
          description: [
            room.description,
            room.bedType ? `Bed: ${room.bedType}.` : "",
            room.capacity ? `Sleeps ${room.capacity}.` : "",
          ]
            .filter(Boolean)
            .join(" "),
          city: room.city || profile?.city,
          country: room.country || profile?.country,
          priceFrom: room.priceFrom ?? null,
          tags: room.tags || [],
          amenities: room.amenities || [],
          status: "ACTIVE",
        }),
      });
      if (res.ok) ok += 1;
    }
    setAiBusy(false);
    toast.success(`Published ${ok} rooms to Voyara`);
    setDrafts([]);
    setTab("rooms");
    await load();
  }

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center text-[var(--muted)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--accent)]" />
        Opening hotel command center…
      </main>
    );
  }

  const kpis = analytics?.kpis;

  return (
    <main className="dash-canvas min-h-screen">
      <SiteHeader role="PROVIDER" sticky />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=80"
            alt="Hotel"
            fill
            className="object-cover"
            unoptimized
            priority
          />
          <div className="hero-veil absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-5 py-10 md:px-10 md:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                <Hotel className="h-3.5 w-3.5" /> Hotel operations desk
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-white md:text-6xl">
                {profile?.businessName || "Your boutique hotel"}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
                {profile?.city
                  ? `${profile.city}${profile.country ? `, ${profile.country}` : ""}`
                  : "Hotel operations desk"}
                {" · "}
                Rooms, AI import, SILA guest journey, and silent-guest recovery.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {profile && (
                  <Badge
                    variant={profile.status === "APPROVED" ? "success" : "warn"}
                    className="normal-case"
                  >
                    {profile.status}
                  </Badge>
                )}
                <LiveDot label={`${arrivals.length} arriving`} />
                <Badge variant="demo" className="normal-case">
                  AI rate-sheet import
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="hero" size="sm">
                <Link href="/planner">Traveler view</Link>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="border-white/20 bg-white/15 text-white hover:bg-white/25"
                onClick={() => setTab("ai")}
              >
                <Wand2 className="h-4 w-4" />
                AI import
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-10">
        <ProviderTour onJump={(t) => setTab(t as Tab)} />

        <div className="segmented sticky top-[4.2rem] z-20 mb-6">
          {(
            [
              ["overview", "Overview", LayoutDashboard],
              ["concierge", "SILA Journey", MessageCircle],
              ["rooms", "Rooms", BedDouble],
              ["ai", "AI Import", Wand2],
              ["pulse", "Silent Guest", HeartPulse],
              ["profile", "Hotel profile", Building2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn("segmented-btn inline-flex items-center gap-2", tab === id && "is-active")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mb-6 space-y-4">
            <JourneyMap compact highlight={3} />
            <div className="surface-card p-5 text-sm">
              <Eyebrow>Show owners · Hotel</Eyebrow>
              <p className="mt-2 text-[var(--muted)]">
                You are the <strong className="text-[var(--ink)]">hotel</strong>. Travelers confirm
                stays on <strong className="text-[var(--ink)]">Hotels</strong>. Those guests appear
                in <strong className="text-[var(--ink)]">SILA Journey</strong>. You send WhatsApp
                stages; guest replies 1/2/3; you Confirm. Full script:{" "}
                <a href="/how-it-works" className="font-semibold text-[var(--accent)]">
                  How it works
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Room views" value={kpis?.views ?? 167} hint="Last 14 days" icon={<Eye className="h-4 w-4" />} />
              <KpiCard label="Saves" value={kpis?.saves ?? 38} hint="Travelers hearted you" icon={<Heart className="h-4 w-4" />} />
              <KpiCard label="Inquiries" value={kpis?.inquiries ?? 20} hint={`${kpis?.conversion ?? 12}% convert`} icon={<MessageSquare className="h-4 w-4" />} />
              <KpiCard
                label="Avg nightly"
                value={formatCurrency(kpis?.avgPrice || 145)}
                hint={`${hotelListings.length || kpis?.active || 0} live rooms`}
                icon={<DollarSign className="h-4 w-4" />}
              />
            </div>

            <Surface>
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <Eyebrow>Arriving guests · limited intel</Eyebrow>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    What the hotel needs - not the full chat
                  </h2>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setTab("concierge")}>
                  Open SILA Journey
                </Button>
              </div>
              <div className="space-y-2">
                {arrivals.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">
                    No arrivals yet. When a traveler books on WhatsApp or the planner, they appear
                    here with first name, room, dates, and trip vibe.
                  </p>
                )}
                {arrivals.map((a) => (
                  <article
                    key={a.stayId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] bg-[var(--panel-solid)] px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-semibold text-[var(--ink)]">{a.firstName}</span>
                      <span className="text-[var(--muted)]">
                        {" "}
                        · {a.room} · {a.phoneMasked}
                      </span>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {[a.travelerType, a.tripCity, ...(a.vibe || [])]
                          .filter(Boolean)
                          .join(" · ") || "Vibe still learning"}
                        {a.openRequests.length
                          ? ` · ${a.openRequests.length} open request(s)`
                          : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{a.stage.replaceAll("_", " ")}</Badge>
                  </article>
                ))}
              </div>
            </Surface>

            <div className="grid gap-6 xl:grid-cols-5">
              <section className="surface-card p-5 xl:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                    Demand pulse
                  </h2>
                  <Badge variant="outline">14 days</Badge>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.viewsSeries || []}>
                      <defs>
                        <linearGradient id="hotelViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.teal} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CHART.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="date" stroke={CHART.muted} fontSize={11} />
                      <YAxis stroke={CHART.muted} fontSize={11} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke={CHART.teal}
                        fill="url(#hotelViews)"
                        strokeWidth={2.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="inquiries"
                        stroke={CHART.coral}
                        fill="transparent"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-3xl border border-[var(--accent)]/25 bg-[linear-gradient(160deg,#0f243a,#0f9c8c)] p-5 text-white shadow-sm xl:col-span-2">
                <div className="mb-3 inline-flex rounded-2xl bg-white/15 p-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  SILA guest journey
                </h2>
                <p className="mt-2 text-sm text-white/90">
                  Full Concierge Guest Journey deck: hotel controls stages; guest answers on
                  WhatsApp or the web chat link. Upsells, mid-stay care, late checkout, rating +
                  discount code.
                </p>
                <Button
                  className="mt-5 bg-[#ffe3c8] text-[#0f243a] hover:bg-white"
                  onClick={() => setTab("concierge")}
                >
                  Open Concierge Journey
                </Button>
              </section>
            </div>

            <section className="rounded-3xl border border-[var(--line)] bg-white/90 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-xl">Live rooms</h2>
                <Button size="sm" variant="secondary" onClick={() => setTab("rooms")}>
                  Manage rooms
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(hotelListings.length ? hotelListings : profile?.listings || [])
                  .slice(0, 3)
                  .map((room, i) => (
                    <RoomCard key={room.id} room={room} image={ROOM_IMAGES[i % ROOM_IMAGES.length]} />
                  ))}
                {(!profile || profile.listings.length === 0) && (
                  <p className="text-sm text-[var(--muted)]">
                    No rooms yet — import a rate sheet with AI.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "rooms" && (
          <div className="grid gap-6 lg:grid-cols-5">
            <section className="rounded-3xl border border-[var(--line)] bg-white/90 p-5 lg:col-span-3">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">Room catalog</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                What travelers see when Voyara recommends your stay.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(hotelListings.length ? hotelListings : profile?.listings || []).map(
                  (room, i) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      image={ROOM_IMAGES[i % ROOM_IMAGES.length]}
                    />
                  )
                )}
              </div>
            </section>
            <section className="rounded-3xl border border-[var(--line)] bg-white/90 p-5 lg:col-span-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl">Add one room</h2>
              <form onSubmit={addRoom} className="mt-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="title">Room name</Label>
                  <Input id="title" name="title" required placeholder="Deluxe King with terrace" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" required rows={3} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" defaultValue={profile?.city || ""} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      defaultValue={profile?.country || ""}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="priceFrom">Nightly from</Label>
                    <Input id="priceFrom" name="priceFrom" type="number" min="0" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="amenities">Amenities</Label>
                    <Input id="amenities" name="amenities" placeholder="wifi, ac, breakfast" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" name="tags" placeholder="couples, suite, desert-view" />
                </div>
                <Button type="submit" disabled={!profile} className="w-full">
                  <BedDouble className="h-4 w-4" />
                  Publish room
                </Button>
              </form>
            </section>
          </div>
        )}

        {tab === "ai" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-dashed border-[var(--accent)]/40 bg-white/90 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--accent)]/10 p-3">
                  <Upload className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    Drop your hotel document
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    PDF, Word (.docx), Excel (.xlsx/.csv), or paste text. AI maps everything into
                    your Voyara room template automatically.
                  </p>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] bg-[linear-gradient(180deg,#fff,#f3fbf9)] px-4 py-12 text-center transition hover:border-[var(--accent)]">
                {aiBusy ? (
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--accent)]" />
                ) : (
                  <FileText className="mb-3 h-8 w-8 text-[var(--accent)]" />
                )}
                <span className="text-sm font-semibold text-[var(--ink)]">
                  {aiBusy ? "Voyara AI is reading your rooms…" : "Choose PDF / Word / Excel / CSV"}
                </span>
                <span className="mt-1 text-xs text-[var(--muted)]">
                  Demo tip: download sample CSV → upload → Publish selected
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls"
                  className="hidden"
                  disabled={aiBusy}
                  onChange={(e) => void runAiImport(e.target.files?.[0] || null)}
                />
              </label>

              <div className="mt-4 space-y-2">
                <Label htmlFor="paste">Or paste rate sheet text</Label>
                <Textarea
                  id="paste"
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Deluxe King — $145 — king bed, balcony, wifi…"
                />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={aiBusy} onClick={() => void runAiImport(null)}>
                    <Wand2 className="h-4 w-4" />
                    Extract with AI
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <a href="/samples/hotel-rooms-sample.csv" download>
                      Sample Excel/CSV
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a href="/samples/hotel-rooms-sample.txt" download>
                      Sample TXT
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Yes — after AI preview you click <strong>Publish selected</strong> and rooms land
                  in your catalog with titles, prices, amenities, tags. No retyping.
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--line)] bg-white/90 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl">AI preview</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Review rooms, then publish into your hotel template.
                  </p>
                </div>
                {drafts.length > 0 && (
                  <Button disabled={aiBusy} onClick={() => void publishSelected()}>
                    <Check className="h-4 w-4" />
                    Publish selected
                  </Button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {drafts.length === 0 && (
                  <div className="rounded-2xl border border-[var(--line)] bg-[#f7fbfa] p-6 text-sm text-[var(--muted)]">
                    Uploaded rooms will appear here with price, amenities, and tags — ready for one-click
                    publish.
                  </div>
                )}
                {drafts.map((room, i) => (
                  <label
                    key={`${room.title}-${i}`}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border p-4 transition",
                      selected[i]
                        ? "border-[var(--accent)] bg-[rgba(15,156,140,0.06)]"
                        : "border-[var(--line)] bg-white"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={Boolean(selected[i])}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [i]: e.target.checked }))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[var(--ink)]">{room.title}</h3>
                        {room.priceFrom != null && (
                          <span className="shrink-0 text-sm font-semibold text-[var(--accent-2)]">
                            {formatCurrency(room.priceFrom, room.currency || "USD")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{room.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {room.bedType && <Badge variant="outline">{room.bedType}</Badge>}
                        {room.capacity && <Badge variant="outline">Sleeps {room.capacity}</Badge>}
                        {(room.amenities || []).slice(0, 4).map((a) => (
                          <Badge key={a} variant="outline">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "concierge" && <ConciergeJourneyPanel />}

        {tab === "pulse" && <GuestPulsePanel />}

        {tab === "profile" && (
          <section className="mx-auto max-w-2xl rounded-3xl border border-[var(--line)] bg-white/90 p-6 shadow-sm">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Hotel profile</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              This is how your property appears to Voyara travelers and admins.
            </p>
            <form onSubmit={saveProfile} className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="businessName">Hotel name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  required
                  defaultValue={profile?.businessName || "Petra Rose Boutique Hotel"}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={profile?.city || "Wadi Musa"} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" defaultValue={profile?.country || "Jordan"} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Story</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={
                    profile?.description ||
                    "A boutique stay near Petra with desert-view rooms and warm Jordanian hospitality."
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" placeholder="https://" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+962…" />
                </div>
              </div>
              <Button type="submit">Save hotel profile</Button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

function RoomCard({ room, image }: { room: Listing; image: string }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-36 w-full">
        <Image src={image} alt={room.title} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-2 start-2 end-2 flex items-end justify-between gap-2">
          <Badge className="bg-white/20 text-white backdrop-blur">
            {room.category.toLowerCase()}
          </Badge>
          {room.priceFrom != null && (
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-[var(--ink)]">
              from {formatCurrency(room.priceFrom)}
            </span>
          )}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-[var(--ink)]">{room.title}</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {room.city}, {room.country}
        </p>
        <p className="mt-2 line-clamp-2 text-xs text-[var(--ink)]/80">{room.description}</p>
      </div>
    </article>
  );
}
