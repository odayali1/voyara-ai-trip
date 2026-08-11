"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const FACES = [
  { score: 1, label: "Awful" },
  { score: 2, label: "Meh" },
  { score: 3, label: "Okay" },
  { score: 4, label: "Good" },
  { score: 5, label: "Loved it" },
];

export default function GuestPulsePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [already, setAlready] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/pulse/${token}`);
      setLoading(false);
      if (!res.ok) return;
      const data = await res.json();
      setHotelName(data.hotelName || "Your hotel");
      setGuestName(data.guestName || "Guest");
      setRoomName(data.roomName || "your room");
      setAlready(Boolean(data.alreadyReplied));
      if (data.pulseScore) setScore(data.pulseScore);
    })();
  }, [token]);

  async function submit() {
    if (!score) return;
    setSaving(true);
    const res = await fetch(`/api/pulse/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, note }),
    });
    setSaving(false);
    if (!res.ok) return;
    const data = await res.json();
    setDone(data.thankYou);
    setAlready(true);
  }

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </main>
    );
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white/95 p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Mid-stay check-in
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          {hotelName}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Hi {guestName} — how is {roomName} feeling so far? This stays private with the hotel
          team so they can help before you leave.
        </p>

        {done || already ? (
          <div className="mt-6 rounded-2xl bg-[rgba(15,156,140,0.08)] p-4 text-sm text-[var(--ink)]">
            {done || "Thanks — your check-in was already received."}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-5 gap-2">
              {FACES.map((f) => (
                <button
                  key={f.score}
                  type="button"
                  onClick={() => setScore(f.score)}
                  className={`rounded-2xl border px-1 py-3 text-center transition ${
                    score === f.score
                      ? "border-[var(--accent)] bg-[rgba(15,156,140,0.12)]"
                      : "border-[var(--line)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <div className="text-lg font-bold text-[var(--ink)]">{f.score}</div>
                  <div className="text-[10px] text-[var(--muted)]">{f.label}</div>
                </button>
              ))}
            </div>
            <Textarea
              className="mt-4"
              rows={3}
              placeholder="Anything we can fix? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button className="mt-4 w-full" disabled={!score || saving} onClick={() => void submit()}>
              {saving ? "Sending…" : "Send private check-in"}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
