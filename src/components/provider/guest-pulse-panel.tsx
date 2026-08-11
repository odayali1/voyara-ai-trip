"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Siren,
  HeartHandshake,
  Send,
  Copy,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Pulse = {
  id: string;
  guestName: string;
  roomName: string;
  status: string;
  riskLevel: string;
  pulseScore: number | null;
  pulseNote: string | null;
  recoveryNote: string | null;
  pulseUrl: string;
  pulseSentAt: string | null;
  checkIn: string;
  checkOut: string;
};

type Summary = {
  inHouse: number;
  silent: number;
  highRisk: number;
  saved: number;
  avgScore: number;
};

export function GuestPulsePanel() {
  const [loading, setLoading] = useState(true);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/providers/pulses");
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setPulses(data.pulses || []);
    setSummary(data.summary || null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(action: string, id: string, extra?: Record<string, unknown>) {
    setBusyId(id);
    const res = await fetch("/api/providers/pulses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, ...extra }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Action failed");
      return;
    }
    const data = await res.json();
    if (data.pulseUrl) {
      try {
        await navigator.clipboard.writeText(data.pulseUrl);
        toast.success("Pulse link copied — send to guest on WhatsApp/SMS");
      } catch {
        toast.success(data.message || "Pulse sent");
      }
    } else {
      toast.success("Updated");
    }
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading guest pulse…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--line)] bg-[linear-gradient(135deg,#fff7f0,#f3fbf8)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-2)]">
              <ShieldAlert className="h-3.5 w-3.5" /> Silent Guest Shield
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] md:text-3xl">
              Catch issues before the bad review
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Guests often stay quiet at the front desk, then post a 1★ review later. Voyara sends a
              private mid-stay pulse. Low scores alert your team so you can fix the stay — not the
              reputation.
            </p>
          </div>
          <Badge variant="demo" className="normal-case">
            Demo stays loaded
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["In-house", summary?.inHouse ?? 0, "Active stays"],
            ["Silent risk", summary?.silent ?? 0, "No reply yet"],
            ["High risk", summary?.highRisk ?? 0, "Score ≤ 2"],
            ["Recovered", summary?.saved ?? 0, "Saved from bad review"],
          ].map(([label, value, hint]) => (
            <div key={String(label)} className="rounded-2xl border border-white/80 bg-white/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                {value}
              </p>
              <p className="text-xs text-[var(--muted)]">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {pulses.map((p) => (
          <article
            key={p.id}
            className={cn(
              "rounded-3xl border bg-white/95 p-4 shadow-sm",
              p.riskLevel === "HIGH" && "border-red-200",
              p.riskLevel === "SILENT" && "border-amber-200",
              p.riskLevel === "LOW" && "border-emerald-200"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-[var(--ink)]">{p.guestName}</h3>
                  <RiskBadge risk={p.riskLevel} />
                  <Badge variant="outline" className="normal-case">
                    {p.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {p.roomName} · {new Date(p.checkIn).toLocaleDateString()} →{" "}
                  {new Date(p.checkOut).toLocaleDateString()}
                </p>
                {p.pulseScore != null && (
                  <p className="mt-2 text-sm text-[var(--ink)]">
                    Pulse: <strong>{p.pulseScore}/5</strong>
                    {p.pulseNote ? ` — “${p.pulseNote}”` : ""}
                  </p>
                )}
                {p.riskLevel === "SILENT" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-amber-800">
                    <Siren className="h-4 w-4" />
                    Silent so far — send a pulse before checkout.
                  </p>
                )}
                {p.recoveryNote && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-800">
                    <HeartHandshake className="h-4 w-4" />
                    Recovery: {p.recoveryNote}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === p.id}
                  onClick={() => void act("send_pulse", p.id)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send pulse
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(p.pulseUrl);
                    toast.success("Guest link copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </Button>
                {p.riskLevel === "SILENT" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() =>
                      void act("simulate_reply", p.id, {
                        score: 2,
                        note: "AC noisy / slow Wi‑Fi — demo unhappy reply",
                      })
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Demo: guest replies 2★
                  </Button>
                )}
              </div>
            </div>

            {(p.riskLevel === "HIGH" || p.status === "RECOVERING") && p.status !== "SAVED" && (
              <div className="mt-3 flex flex-col gap-2 border-t border-[var(--line)] pt-3 sm:flex-row">
                <Input
                  placeholder="Recovery action (e.g. moved room + fruit basket)"
                  value={recoveryDraft[p.id] || ""}
                  onChange={(e) =>
                    setRecoveryDraft((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
                <Button
                  size="sm"
                  disabled={busyId === p.id}
                  onClick={() =>
                    void act("recover", p.id, {
                      recoveryNote:
                        recoveryDraft[p.id] || "Comp breakfast + engineering fixed issue same day",
                    })
                  }
                >
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Mark recovered
                </Button>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { label: string; className: string }> = {
    SILENT: { label: "Silent risk", className: "bg-amber-100 text-amber-900" },
    HIGH: { label: "High risk", className: "bg-red-100 text-red-800" },
    WATCH: { label: "Watch", className: "bg-orange-100 text-orange-900" },
    LOW: { label: "Happy", className: "bg-emerald-100 text-emerald-800" },
  };
  const item = map[risk] || map.WATCH;
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", item.className)}>
      {item.label}
    </span>
  );
}
