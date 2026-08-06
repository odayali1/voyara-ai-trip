"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Save, Share2, CloudSun, Sparkles, MapPinned, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TripMap, type MapStop } from "@/components/map/trip-map";
import { ItineraryPanel } from "@/components/planner/itinerary-panel";
import { PricePanel } from "@/components/planner/price-panel";
import type { ItineraryPlan } from "@/lib/itinerary-schema";
import type { PriceOffer } from "@/lib/mock-prices";
import type { WeatherDay } from "@/lib/geo";
import { buildPromptFromHint } from "@/lib/prompt-hint";
import { toast } from "sonner";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };
type Stage = "idle" | "chatting" | "mapping" | "ready";

const QUICK_PROMPTS = [
  "Jordan · nature · 5 days",
  "بدي اروح الأردن أشوف الطبيعة",
  "Tokyo · food + culture",
  "Lisbon · couples weekend",
];

export function PlannerStudio({
  tripId,
  initialMessages = [],
  initialPlan = null,
  destinationHint,
  autoStart = false,
  isAuthenticated = false,
}: {
  tripId?: string;
  initialMessages?: ChatMsg[];
  initialPlan?: ItineraryPlan | null;
  destinationHint?: string;
  autoStart?: boolean;
  isAuthenticated?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [input, setInput] = useState(() =>
    destinationHint ? buildPromptFromHint(destinationHint) : ""
  );
  const [plan, setPlan] = useState<ItineraryPlan | null>(initialPlan);
  const [activeTripId, setActiveTripId] = useState<string | undefined>(tripId);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>(initialPlan ? "ready" : "idle");
  const [flights, setFlights] = useState<PriceOffer[]>([]);
  const [hotels, setHotels] = useState<PriceOffer[]>([]);
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "map" | "plan">("chat");
  const autoStarted = useRef(false);

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
        setStage("ready");
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
    if (!autoStart || autoStarted.current || !destinationHint) return;
    autoStarted.current = true;
    const prompt = buildPromptFromHint(destinationHint);
    if (prompt) void sendMessage(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, destinationHint]);

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
    setStage("chatting");
    setInput("");
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);

    let trip: string | undefined = activeTripId;
    if (isAuthenticated) {
      trip = (await ensureTrip()) || undefined;
      if (!trip) {
        setLoading(false);
        setStage("idle");
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

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let gotPlan = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          for (const line of part.split("\n")) {
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
                if (assistantText.length > 180 && !gotPlan) setStage("mapping");
                assistantText += event.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantText } : m
                  )
                );
              }
              if (event.type === "plan" && event.plan) {
                gotPlan = true;
                setPlan(event.plan);
                setStage("ready");
                setMobileTab("map");
              }
            } catch {
              /* ignore */
            }
          }
        }
      }
      if (!gotPlan) setStage(assistantText ? "chatting" : "idle");
    } catch {
      toast.error("Planning failed. Try again in a moment.");
      setStage("idle");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "تعذر إنشاء الخطة الآن — حاول مرة أخرى. / Could not finish that plan, please retry.",
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
      void saveTrip();
      toast.message("Save the trip to get a share link");
      return;
    }
    void navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied");
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3 md:grid md:grid-cols-12 md:gap-4">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
          <span className="stage-pill shrink-0" data-active={stage === "chatting"}>
            <Sparkles className="h-3.5 w-3.5" /> Story
          </span>
          <span
            className="stage-pill shrink-0"
            data-active={stage === "mapping" || stage === "ready"}
          >
            <MapPinned className="h-3.5 w-3.5" /> Map
          </span>
          <span className="stage-pill shrink-0" data-active={stage === "ready"}>
            <Route className="h-3.5 w-3.5" /> Ready
          </span>
        </div>
        <div className="flex shrink-0 gap-1 md:hidden">
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
      </div>

      <section
        className={`glass-panel flex min-h-0 flex-col rounded-3xl md:col-span-4 ${
          mobileTab !== "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Voyara
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {isAuthenticated ? "Your AI travel fixer" : "Guest mode · free to explore"}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-2xl border border-[var(--line)] bg-white/70 p-4"
            >
              <p className="text-sm text-[var(--ink)]">
                Tell Voyara the vibe — nature in Jordan, food in Tokyo, a couples weekend…
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    dir="auto"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              dir="auto"
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "ml-auto bg-[var(--chat-user)] text-white"
                  : "bg-white text-[var(--ink)] border border-[var(--line)]"
              }`}
            >
              {m.content || (loading ? "…" : "")}
            </motion.div>
          ))}
          <AnimatePresence>
            {loading && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="planning-pulse text-xs text-[var(--muted)]"
              >
                {stage === "mapping"
                  ? "Pinning experiences on the map…"
                  : "Designing your days… map pins arrive next."}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-[var(--line)] p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="وين حاب تسافر؟ / Where should we go?"
              className="min-h-[72px] resize-none"
              dir="auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <Button className="self-end" onClick={() => void sendMessage()} disabled={loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section
        className={`glass-panel relative h-[55vh] min-h-[360px] overflow-hidden rounded-3xl md:col-span-5 md:h-full ${
          mobileTab !== "map" ? "hidden md:block" : "block"
        }`}
      >
        <TripMap
          stops={mapStops}
          visible
          className="absolute inset-0 h-full w-full"
        />
        {mapStops.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-3 rounded-2xl border border-[var(--line)] bg-white/85 px-3 py-3 text-xs text-[var(--muted)] backdrop-blur">
            {loading
              ? "Scouting places… pins will cascade onto the map in a moment."
              : "Your living map — experiences appear here as Voyara plans."}
          </div>
        )}
        {weather.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white/90 p-2 backdrop-blur">
            <CloudSun className="mt-1 h-4 w-4 shrink-0 text-[var(--accent-2)]" />
            {weather.map((w) => (
              <div key={w.date} className="min-w-[72px] text-center text-[11px] text-[var(--ink)]">
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
        className={`glass-panel min-h-0 space-y-4 overflow-y-auto rounded-3xl p-4 md:col-span-3 ${
          mobileTab !== "plan" ? "hidden md:block" : "block"
        }`}
      >
        <ItineraryPanel
          plan={plan}
          loading={loading && !plan}
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
          <div className="rounded-xl border border-[var(--line)] bg-white/70 p-3 text-xs text-[var(--muted)]">
            Share link ready <Badge variant="outline">public</Badge>
            <div className="mt-1 break-all text-[var(--ink)]">{shareUrl}</div>
          </div>
        )}
      </section>
    </div>
  );
}
