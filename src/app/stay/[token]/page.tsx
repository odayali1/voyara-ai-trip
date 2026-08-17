"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: string;
  body: string;
  choices: string[];
  stage: string | null;
  createdAt: string;
};

export default function GuestStayPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("SILA");
  const [guestName, setGuestName] = useState("");
  const [stage, setStage] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/stay/${token}`);
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setHotelName(data.stay?.hotelName || "SILA");
    setGuestName(data.stay?.guestName || "");
    setStage(data.stay?.stage || "");
    setMessages(data.messages || []);
  }

  useEffect(() => {
    void load();
  }, [token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function choose(choice: string) {
    setSending(true);
    const res = await fetch(`/api/stay/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice }),
    });
    setSending(false);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages || []);
    setStage(data.stay?.stage || stage);
  }

  const lastHotel = [...messages].reverse().find((m) => m.role === "hotel");
  const choices = lastHotel?.choices || [];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b1220]">
        <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#4c1d95,transparent_35%),radial-gradient(circle_at_80%_0%,#83184355,transparent_30%),#0b1220] text-white"
      dir="auto"
    >
      <div className="mx-auto flex min-h-screen max-w-lg flex-col">
        <header className="border-b border-white/10 px-5 py-4 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200/80">
            SILA · The smarter way to stay
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl">{hotelName}</h1>
          <p className="text-xs text-white/60">
            {guestName ? `أهلاً ${guestName}` : "Guest journey"} · {stage.replaceAll("_", " ")}
          </p>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow",
                m.role === "guest"
                  ? "ms-auto bg-violet-500 text-white"
                  : "bg-white/10 text-white/95 border border-white/10"
              )}
            >
              {m.body}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {choices.length > 0 && stage !== "DONE" && (
          <div className="border-t border-white/10 bg-black/25 p-4 backdrop-blur">
            <p className="mb-2 text-xs text-white/60">اختر رد سريع / Quick reply</p>
            <div className="flex flex-wrap gap-2">
              {choices.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  disabled={sending}
                  variant="secondary"
                  className="rounded-full bg-white/95 text-[#1b1030] hover:bg-violet-100"
                  onClick={() => void choose(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
