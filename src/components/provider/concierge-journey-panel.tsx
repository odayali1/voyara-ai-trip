"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Loader2,
  MessageCircle,
  Sparkles,
  ChevronRight,
  CheckCircle2,
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
  roomName: string;
  stage: string;
  language: string;
  guestUrl: string;
  checkIn: string;
  checkOut: string;
  rating?: number | null;
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

export function ConciergeJourneyPanel() {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newGuest, setNewGuest] = useState("سارة خالد");
  const [newRoom, setNewRoom] = useState("Family Suite Twin");

  const selected = stays.find((s) => s.id === selectedId) || stays[0] || null;

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
  }, []);

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
      toast.success("Guest journey link ready");
    } else {
      toast.success("Journey updated");
    }
    await load();
    if (data.stay?.id) setSelectedId(data.stay.id);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading SILA journey…
      </div>
    );
  }

  const stageIndex = stages.findIndex((s) => s.id === selected?.stage);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#3b0764]/20 bg-[linear-gradient(120deg,#1e1b4b,#4c1d95_45%,#9d174d)] p-6 text-white shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100/80">
          SILA Concierge
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl">
          The smarter way to stay
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-violet-50/90">
          Full guest journey from the stakeholder deck: قبل الوصول → تسجيل الدخول → عروض → أثناء
          الإقامة → خدمات → قبل المغادرة → تقييم بعد المغادرة. Hotel pushes, guest taps, revenue +
          recovery happen in-chat.
        </p>
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
                    ? "border-violet-400 bg-violet-50"
                    : "border-[var(--line)] hover:bg-black/[0.02]"
                )}
              >
                <div className="font-medium text-[var(--ink)]">{s.guestName}</div>
                <div className="text-xs text-[var(--muted)]">
                  {s.roomName} · {s.stage.replaceAll("_", " ")}
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
                })
              }
            >
              <Sparkles className="h-4 w-4" />
              Start journey
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
                    {selected.roomName} ·{" "}
                    {new Date(selected.checkIn).toLocaleDateString()} →{" "}
                    {new Date(selected.checkOut).toLocaleDateString()}
                  </p>
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
                    Copy guest link
                  </Button>
                  <Button size="sm" asChild>
                    <a href={selected.guestUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Open guest chat
                    </a>
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
                        ? "border-violet-300 bg-violet-50 text-violet-950"
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
                <div className="rounded-2xl border border-[var(--line)] bg-[#f8f5ff] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-800">
                    Journey chat preview
                  </p>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {selected.messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[92%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap",
                          m.role === "guest"
                            ? "ms-auto bg-violet-600 text-white"
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
                          Requests appear when the guest taps an offer in chat.
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
