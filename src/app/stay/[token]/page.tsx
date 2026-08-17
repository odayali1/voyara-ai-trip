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

  const lastHotel = [...messages].reverse().find((m) => m.role === "hotel" && m.choices?.length);
  const choices = lastHotel?.choices || [];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f243a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0f9c8c]" />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#0f243a] text-[#f7f1e8]"
      style={{ fontFamily: "var(--font-arabic), var(--font-body), system-ui, sans-serif" }}
      dir="auto"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(15,156,140,0.35),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(255,138,76,0.22),transparent_38%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col">
        <header className="border-b border-white/10 bg-[#0f243a]/90 px-5 py-5 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7dede0]">
            SILA · The smarter way to stay
          </p>
          <h1
            className="mt-1 text-3xl tracking-tight text-white"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {hotelName}
          </h1>
          <p className="mt-1 text-sm text-[#d7e4ef]">
            {guestName ? `أهلاً ${guestName}` : "Guest journey"}
            {stage ? ` · ${stage.replaceAll("_", " ").toLowerCase()}` : ""}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#9db3c7]">
            أنت الضيف — اختر رداً. الفندق يشوف طلبك فوراً على SILA Journey.
          </p>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {messages.length === 0 && (
            <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-[#d7e4ef]">
              بانتظار رسالة الفندق… افتح SILA Journey واضغط Send stage on WhatsApp أو Next stage.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-[15px] leading-relaxed shadow-md",
                m.role === "guest"
                  ? "ms-auto bg-[#0f9c8c] text-white"
                  : "border border-[#d7e4ef]/25 bg-[#f7f1e8] text-[#0f243a]"
              )}
            >
              {m.body}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {choices.length > 0 && stage !== "DONE" && (
          <div className="border-t border-white/10 bg-[#0b1a2a] p-4">
            <p className="mb-2 text-xs text-[#9db3c7]">اختر رد سريع · Quick reply</p>
            <div className="flex flex-wrap gap-2">
              {choices.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  disabled={sending}
                  className="rounded-full border-0 bg-[#ffe3c8] font-semibold text-[#0f243a] hover:bg-white"
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
