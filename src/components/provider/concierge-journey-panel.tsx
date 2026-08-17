"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Loader2,
  MessageCircle,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  QrCode,
  Send,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Stage = { id: string; labelEn: string; labelAr: string; order: number };
type Stay = {
  id: string;
  guestName: string;
  guestPhone?: string | null;
  guestPhoneMasked?: string | null;
  roomName: string;
  stage: string;
  language: string;
  guestUrl: string;
  checkIn: string;
  checkOut: string;
  rating?: number | null;
  source?: string | null;
  tripLabel?: string | null;
  guestIntel?: {
    travelerType: string | null;
    interests: string[];
    lastDestination: string | null;
  } | null;
  messages: Array<{ id: string; role: string; body: string; createdAt: string }>;
  requests: Array<{ id: string; title: string; status: string; stage?: string | null }>;
};
type Offer = {
  id: string;
  stage: string;
  title: string;
  titleAr?: string | null;
  emoji?: string | null;
  priceFrom?: number | null;
};
type WaStatus = {
  configured: boolean;
  state?: string;
  instance?: string;
  error?: string | null;
  demoGuestPhone?: string;
  hint?: string;
};

export function ConciergeJourneyPanel() {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newGuest, setNewGuest] = useState("سارة خالد");
  const [newRoom, setNewRoom] = useState("Family Suite Twin");
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  const selected = stays.find((s) => s.id === selectedId) || stays[0] || null;

  async function loadWa() {
    const res = await fetch("/api/providers/whatsapp");
    if (!res.ok) return;
    setWa(await res.json());
  }

  async function load() {
    const res = await fetch("/api/providers/concierge");
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setStages(data.stages || []);
    setStays(data.stays || []);
    setOffers(data.offers || []);
    if (!selectedId && data.stays?.[0]?.id) setSelectedId(data.stays[0].id);
  }

  useEffect(() => {
    void load();
    void loadWa();
  }, []);

  useEffect(() => {
    if (!wa?.configured || wa.state !== "open") return;
    // Keep webhook pointed at this Voyara deployment
    void fetch("/api/providers/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup_webhook" }),
    }).catch(() => undefined);
  }, [wa?.configured, wa?.state]);

  async function act(action: string, extra?: Record<string, unknown>) {
    if (!selected && action !== "create_stay") return;
    setBusy(true);
    const res = await fetch("/api/providers/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        stayId: selected?.id,
        ...extra,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Action failed");
      return;
    }
    const data = await res.json();
    if (data.guestUrl) {
      try {
        await navigator.clipboard.writeText(data.guestUrl);
      } catch {
        /* ignore */
      }
      if (data.whatsapp?.sent?.ok || data.whatsapp?.sent === true) {
        toast.success("Guest created + WhatsApp stage 1 sent — guest should reply 1/2/3");
      } else {
        toast.success("Guest created — tap Send stage on WhatsApp");
      }
    } else if (data.whatsapp?.sent?.ok) {
      toast.success("Stage sent on WhatsApp");
    } else {
      toast.success("Journey updated");
    }
    await load();
    if (data.stay?.id) setSelectedId(data.stay.id);
  }

  async function waAct(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/providers/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, stayId: selected?.id, ...extra }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "WhatsApp action failed");
      return data;
    }
    if (action === "qr") {
      setQrBase64(data.base64 || null);
      if (!data.base64) toast.error(data.error || "No QR yet — create instance first");
      else toast.success("Scan this QR with WhatsApp Linked Devices");
    } else if (action === "create_instance") {
      toast.success(data.ok ? "Instance created" : data.error || "Create failed");
      await loadWa();
    } else if (action === "setup_webhook") {
      toast.success(data.ok ? `Webhook set: ${data.webhookUrl}` : data.error || "Webhook failed");
    } else if (action === "send_stage" || action === "test_ping") {
      toast.success(data.sent?.ok ? "WhatsApp message sent" : data.sent?.error || "Send failed");
      await load();
    }
    await loadWa();
    return data;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading SILA journey…
      </div>
    );
  }

  const stageIndex = stages.findIndex((s) => s.id === selected?.stage);
  const waOpen = wa?.state === "open";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[var(--accent)]/25 bg-[linear-gradient(120deg,#0f243a,#16324f_40%,#0f9c8c)] p-6 text-white shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7dede0]">
          SILA Concierge
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl">
          The smarter way to stay
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          This is the <strong>hotel monitor</strong> after a traveler confirms a stay on Voyara
          Hotels (or after you create a demo guest). You send numbered WhatsApp stages. Guest
          replies <strong>1 / 2 / 3</strong>. You Confirm. Then Next stage.
        </p>
        <div className="mt-4 grid gap-2 text-xs text-white/90 md:grid-cols-4">
          <div className="rounded-xl bg-white/10 px-3 py-2">1. Guest appears here</div>
          <div className="rounded-xl bg-white/10 px-3 py-2">2. Send stage on WhatsApp</div>
          <div className="rounded-xl bg-white/10 px-3 py-2">3. Guest replies 1/2/3</div>
          <div className="rounded-xl bg-white/10 px-3 py-2">4. Confirm → Next stage</div>
        </div>
        <a
          href="/how-it-works"
          className="mt-4 inline-block text-xs font-semibold text-[#ffe3c8] underline-offset-2 hover:underline"
        >
          Full A → Z walkthrough
        </a>
      </section>

      <aside className="rounded-2xl border border-[var(--accent)]/25 bg-[color-mix(in_oklab,var(--accent)_8%,white)] p-4 text-sm text-[var(--muted)]">
        <p className="font-semibold text-[var(--ink)]">What “Start journey” does</p>
        <p className="mt-1">
          Creates a demo guest stay + sends <strong className="text-[var(--ink)]">stage 1
          (pre-arrival)</strong> to WhatsApp with a numbered menu. When the guest texts{" "}
          <strong className="text-[var(--ink)]">2</strong>, SILA maps that to option 2 and shows a
          request here for you to Confirm.
        </p>
        <p className="mt-2 text-xs">
          Better demo path: Traveler → Hotels → Confirm stay — then the guest shows here as{" "}
          <em>Voyara booking</em>.
        </p>
      </aside>

      <section className="rounded-3xl border border-[var(--line)] bg-white/95 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wifi className={cn("h-4 w-4", waOpen ? "text-emerald-600" : "text-amber-600")} />
              <h3 className="font-semibold text-[var(--ink)]">WhatsApp (Evolution)</h3>
              <Badge variant={waOpen ? "success" : "warn"}>
                {!wa?.configured ? "not configured" : wa.state || "unknown"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Instance: {wa?.instance || "—"} · Demo guest:{" "}
              {wa?.demoGuestPhone || "962796917829"}
              {wa?.hint ? ` · ${wa.hint}` : ""}
              {wa?.error ? ` · ${wa.error}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void loadWa()}>
              Refresh status
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void waAct("create_instance")}
            >
              Create instance
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void waAct("qr")}>
              <QrCode className="h-3.5 w-3.5" />
              Show QR
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void waAct("setup_webhook")}
            >
              Set webhook
            </Button>
            <Button size="sm" disabled={busy || !waOpen} onClick={() => void waAct("test_ping")}>
              <Send className="h-3.5 w-3.5" />
              Test ping
            </Button>
          </div>
        </div>
        {qrBase64 && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-[var(--line)] bg-[#f8f5ff] p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
              alt="WhatsApp QR"
              className="h-56 w-56 rounded-xl bg-white p-2"
            />
            <p className="text-center text-xs text-[var(--muted)]">
              WhatsApp → Linked devices → Link a device → scan. Tell me when status becomes{" "}
              <strong>open</strong>.
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="rounded-3xl border border-[var(--line)] bg-white/95 p-4 xl:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--ink)]">Active journeys</h3>
            <Badge variant="demo">{stays.length}</Badge>
          </div>
          <div className="space-y-2">
            {stays.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "w-full rounded-2xl border p-3 text-start transition",
                  selected?.id === s.id
                    ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_12%,white)]"
                    : "border-[var(--line)] hover:bg-black/[0.02]"
                )}
              >
                <div className="font-medium text-[var(--ink)]">{s.guestName}</div>
                <div className="text-xs text-[var(--muted)]">
                  {s.roomName} · {s.stage.replaceAll("_", " ")}
                  {s.source === "VOYARA_BOOKING" ? " · from Voyara" : ""}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              New demo guest
            </p>
            <Input value={newGuest} onChange={(e) => setNewGuest(e.target.value)} />
            <Input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} />
            <Button
              className="w-full"
              disabled={busy}
              onClick={() =>
                void act("create_stay", {
                  guestName: newGuest,
                  roomName: newRoom,
                  language: "ar",
                  guestPhone: wa?.demoGuestPhone || "962796917829",
                })
              }
            >
              <Sparkles className="h-4 w-4" />
              Create guest + send WhatsApp stage 1
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--line)] bg-white/95 p-4 xl:col-span-8">
          {!selected ? (
            <p className="text-sm text-[var(--muted)]">Create a guest journey to begin.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    {selected.guestName}
                  </h3>
                  <p className="text-sm text-[var(--muted)]">
                    {selected.roomName} · {selected.guestPhoneMasked || "no phone"} ·{" "}
                    {new Date(selected.checkIn).toLocaleDateString()} →{" "}
                    {new Date(selected.checkOut).toLocaleDateString()}
                  </p>
                  {selected.guestIntel && (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Guest vibe (limited):{" "}
                      {[
                        selected.guestIntel.travelerType,
                        ...(selected.guestIntel.interests || []),
                        selected.guestIntel.lastDestination,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "learning from stay"}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(selected.guestUrl);
                      toast.success("Guest chat link copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy web link
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <a href={selected.guestUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Open web chat
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || !waOpen}
                    onClick={() => void waAct("send_stage")}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send stage on WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || selected.stage === "DONE"}
                    onClick={() => void act("advance_stage")}
                  >
                    Next stage
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {stages.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      "min-w-[110px] rounded-2xl border px-3 py-2 text-center",
                      i <= stageIndex
                        ? "border-[var(--accent)]/40 bg-[color-mix(in_oklab,var(--accent)_10%,white)] text-[var(--ink)]"
                        : "border-[var(--line)] text-[var(--muted)]"
                    )}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide">
                      {i + 1}. {s.labelEn}
                    </div>
                    <div className="text-xs" dir="rtl">
                      {s.labelAr}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--accent)_6%,white)] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Journey chat preview
                  </p>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {selected.messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[92%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap",
                          m.role === "guest"
                            ? "ms-auto bg-[var(--accent)] text-white"
                            : "bg-white text-[var(--ink)] border border-[var(--line)]"
                        )}
                        dir="auto"
                      >
                        {m.body}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-[var(--line)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Offers in this stage
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {offers
                        .filter((o) => o.stage === selected.stage)
                        .map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between rounded-xl bg-black/[0.02] px-2.5 py-2 text-sm"
                          >
                            <span>
                              {o.emoji} {o.titleAr || o.title}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {o.priceFrom != null ? `from $${o.priceFrom}` : "comp / ask"}
                            </span>
                          </div>
                        ))}
                      {offers.filter((o) => o.stage === selected.stage).length === 0 && (
                        <p className="text-xs text-[var(--muted)]">No offers for this stage.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--line)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Guest requests
                    </p>
                    <div className="mt-2 space-y-2">
                      {selected.requests.length === 0 && (
                        <p className="text-xs text-[var(--muted)]">
                          Requests appear when the guest replies on WhatsApp or web chat.
                        </p>
                      )}
                      {selected.requests.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-2.5 py-2 text-sm"
                        >
                          <div>
                            <div className="font-medium text-[var(--ink)]">{r.title}</div>
                            <div className="text-[11px] text-[var(--muted)]">{r.status}</div>
                          </div>
                          {r.status === "REQUESTED" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void act("confirm_request", { requestId: r.id })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Confirm
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
