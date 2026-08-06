"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Send, Save, Share2, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TripMap, type MapStop } from "@/components/map/trip-map";
import { ItineraryPanel } from "@/components/planner/itinerary-panel";
import { PricePanel } from "@/components/planner/price-panel";
import type { ItineraryPlan } from "@/lib/itinerary-schema";
import type { PriceOffer } from "@/lib/mock-prices";
import type { WeatherDay } from "@/lib/geo";
import { toast } from "sonner";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Tokyo · 5 days · food + culture",
  "Lisbon · couples weekend",
  "Bali · mid budget · beach + wellness",
  "Paris · family · 4 days",
];

export function PlannerStudio({
  tripId,
  initialMessages = [],
  initialPlan = null,
  destinationHint,
  isAuthenticated = false,
}: {
  tripId?: string;
  initialMessages?: ChatMsg[];
  initialPlan?: ItineraryPlan | null;
  destinationHint?: string;
  isAuthenticated?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [input, setInput] = useState(
    destinationHint
      ? `Plan a 5-day trip to ${destinationHint} focused on food and culture.`
      : ""
  );
  const [plan, setPlan] = useState<ItineraryPlan | null>(initialPlan);
  const [activeTripId, setActiveTripId] = useState<string | undefined>(tripId);
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<PriceOffer[]>([]);
  const [hotels, setHotels] = useState<PriceOffer[]>([]);
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "map" | "plan">("chat");

  const mapStops: MapStop[] = useMemo(() => {
    if (!plan) return [];
    const stops: MapStop[] = [];
    for (const day of plan.days) {
      day.stops.forEach((stop, idx) => {
        if (stop.lat != null && stop.lng != null) {
          stops.push({
            id: `${day.dayNumber}-${idx}`,
            title: stop.title,
            lat: stop.lat,
            lng: stop.lng,
            dayNumber: day.dayNumber,
          });
        }
      });
    }
    return stops;
  }, [plan]);

  useEffect(() => {
    if (initialPlan || initialMessages.length > 0) return;
    try {
      const pendingPlan = sessionStorage.getItem("voyara_pending_plan");
      const pendingMessages = sessionStorage.getItem("voyara_pending_messages");
      if (pendingPlan) {
        setPlan(JSON.parse(pendingPlan) as ItineraryPlan);
        sessionStorage.removeItem("voyara_pending_plan");
      }
      if (pendingMessages) {
        setMessages(JSON.parse(pendingMessages) as ChatMsg[]);
        sessionStorage.removeItem("voyara_pending_messages");
      }
    } catch {
      /* ignore */
    }
  }, [initialPlan, initialMessages.length]);

  useEffect(() => {
    if (!plan?.destination) return;
    const nights = Math.max(plan.days.length - 1, 1);
    void (async () => {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: plan.destination,
          days: plan.days.length,
          nights,
          origin: "Your city",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlights(data.flights || []);
        setHotels(data.hotels || []);
      }

      const weatherRes = await fetch(
        `/api/geo/weather?destination=${encodeURIComponent(plan.destination)}&days=${plan.days.length}`
      );
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        setWeather(data.weather || []);
      }
    })();
  }, [plan?.destination, plan?.days.length]);

  async function ensureTrip() {
    if (activeTripId) return activeTripId;
    if (!isAuthenticated) {
      toast.error("Log in to save and share your trip.");
      window.location.href = `/login?next=/planner`;
      return null;
    }
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: plan?.title || "New trip",
        destination: plan?.destination || "TBD",
      }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        toast.error("Please log in to save your trip.");
        window.location.href = "/login?next=/planner";
        return null;
      }
      toast.error("Could not create trip");
      return null;
    }
    const trip = await res.json();
    setActiveTripId(trip.id);
    setShareUrl(`${window.location.origin}/share/${trip.shareId}`);
    return trip.id as string;
  }

  async function sendMessage(override?: string) {
    const content = (override ?? input).trim();
    if (!content || loading) return;

    setLoading(true);
    setInput("");
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Guests can chat + plan without a DB trip; logged-in users persist.
    let trip: string | undefined = activeTripId;
    if (isAuthenticated) {
      trip = (await ensureTrip()) || undefined;
      if (!trip) {
        setLoading(false);
        return;
      }
    }

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip || null,
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Chat failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;
            try {
              const event = JSON.parse(payload) as {
                type: string;
                text?: string;
                plan?: ItineraryPlan;
              };
              if (event.type === "text" && event.text) {
                assistantText += event.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantText } : m
                  )
                );
              }
              if (event.type === "plan" && event.plan) {
                setPlan(event.plan);
                setMobileTab("map");
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }
    } catch {
      toast.error("Planning failed. Check DeepSeek API key or try again.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "I hit a snag generating that plan. Please verify the API key and try again.",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveTrip() {
    if (!plan) {
      toast.message("Generate a plan first");
      return;
    }
    if (!isAuthenticated) {
      // Stash plan so after login they can continue
      try {
        sessionStorage.setItem("voyara_pending_plan", JSON.stringify(plan));
        sessionStorage.setItem("voyara_pending_messages", JSON.stringify(messages));
      } catch {
        /* ignore */
      }
      toast.message("Create a free account to save this trip");
      window.location.href = "/signup?next=/planner";
      return;
    }
    const trip = await ensureTrip();
    if (!trip) return;
    const res = await fetch(`/api/trips/${trip}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const data = await res.json();
      setShareUrl(`${window.location.origin}/share/${data.shareId}`);
      toast.success("Trip saved");
    } else {
      toast.error("Could not save trip");
    }
  }

  function copyShare() {
    if (!shareUrl) {
      void saveTrip().then(() => {
        /* share set after save */
      });
      toast.message("Save the trip to get a share link");
      return;
    }
    void navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied");
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3 md:grid md:grid-cols-12 md:gap-4">
      <div className="flex gap-2 md:hidden">
        {(["chat", "map", "plan"] as const).map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={mobileTab === tab ? "default" : "secondary"}
            onClick={() => setMobileTab(tab)}
          >
            {tab === "chat" ? "Chat" : tab === "map" ? "Map" : "Plan"}
          </Button>
        ))}
      </div>

      <section
        className={`flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] md:col-span-4 ${
          mobileTab !== "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--sand)]">
              Voyara
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {isAuthenticated ? "Your AI travel fixer" : "Try free — no login needed"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={saveTrip}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={copyShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-xl border border-[var(--line)] bg-black/20 p-4"
            >
              <p className="text-sm text-[var(--sand)]">
                Ask anything — destinations, day-by-day plans, vibes, budget.
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(`Plan a trip: ${prompt}`)}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--sand)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              dir="auto"
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-[var(--accent)] text-[var(--ink)]"
                  : "bg-white/5 text-[var(--sand)]"
              }`}
            >
              {m.content || (loading ? "…" : "")}
            </div>
          ))}
          {loading && (
            <p className="text-xs text-[var(--muted)]">
              Planning… building map pins after the reply.
            </p>
          )}
        </div>

        <div className="border-t border-[var(--line)] p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Where should we go? / وين حاب تسافر؟"
              className="min-h-[72px] resize-none"
              dir="auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <Button
              className="self-end"
              onClick={() => void sendMessage()}
              disabled={loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section
        className={`relative h-[55vh] min-h-[360px] overflow-hidden rounded-2xl border border-[var(--line)] md:col-span-5 md:h-full ${
          mobileTab !== "map" ? "hidden md:block" : "block"
        }`}
      >
        <TripMap
          stops={mapStops}
          visible={mobileTab === "map" || true}
          className="absolute inset-0 h-full w-full"
        />
        {mapStops.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-3 rounded-xl border border-[var(--line)] bg-[var(--ink)]/75 px-3 py-2 text-xs text-[var(--muted)] backdrop-blur">
            Map ready — pins appear after the AI builds your plan.
          </div>
        )}
        {weather.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--ink)]/80 p-2 backdrop-blur">
            <CloudSun className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" />
            {weather.map((w) => (
              <div key={w.date} className="min-w-[72px] text-center text-[11px] text-[var(--sand)]">
                <div className="text-[var(--muted)]">{w.date.slice(5)}</div>
                <div>{w.summary}</div>
                <div>
                  {Math.round(w.tempMax)}° / {Math.round(w.tempMin)}°
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        className={`min-h-0 space-y-4 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 md:col-span-3 ${
          mobileTab !== "plan" ? "hidden md:block" : "block"
        }`}
      >
        <ItineraryPanel
          plan={plan}
          onStopClick={async (_id, title) => {
            await fetch("/api/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType: "stop_clicked",
                payload: { title, destination: plan?.destination },
              }),
            });
          }}
        />
        {(flights.length > 0 || hotels.length > 0) && (
          <div className="border-t border-[var(--line)] pt-4">
            <PricePanel flights={flights} hotels={hotels} />
          </div>
        )}
        {shareUrl && (
          <div className="rounded-lg border border-[var(--line)] p-3 text-xs text-[var(--muted)]">
            Share link ready <Badge variant="outline">public</Badge>
            <div className="mt-1 break-all text-[var(--sand)]">{shareUrl}</div>
          </div>
        )}
      </section>
    </div>
  );
}
