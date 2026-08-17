import { generateText } from "ai";
import { db } from "@/lib/db";
import { deepseek, deepseekModel } from "@/lib/ai";
import { extractJsonObject } from "@/lib/parse-itinerary";

export type GuestIntel = {
  displayName: string | null;
  travelerType: string | null;
  budgetBand: string | null;
  interests: string[];
  companions: string | null;
  homeCity: string | null;
  healthNotes: string | null;
  careNeeds: string[];
  preferences: string[];
  pace: string | null;
  memorySummary: string | null;
  lastDestination: string | null;
};

const TRAVELER_TYPES = new Set(["SOLO", "COUPLE", "FAMILY", "FRIENDS"]);
const BUDGETS = new Set(["BUDGET", "MID", "LUXURY"]);

function uniq(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = String(raw || "").trim();
    if (!v || v.toLowerCase() === "null") continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.slice(0, 12);
}

function clean(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s === "undefined") return null;
  return s;
}

function pickRicher(a?: string | null, b?: string | null) {
  const x = a?.trim() || "";
  const y = b?.trim() || "";
  if (x.length >= y.length && x.length > 0) return x;
  return y || null;
}

function asTravelerType(v: unknown) {
  const s = clean(v)?.toUpperCase() || "";
  return TRAVELER_TYPES.has(s) ? s : null;
}

function asBudget(v: unknown) {
  const s = clean(v)?.toUpperCase() || "";
  return BUDGETS.has(s) ? s : null;
}

export function intelFromGuest(g: {
  displayName?: string | null;
  travelerType?: string | null;
  budgetBand?: string | null;
  interests?: string[];
  companions?: string | null;
  homeCity?: string | null;
  healthNotes?: string | null;
  careNeeds?: string[];
  preferences?: string[];
  pace?: string | null;
  memorySummary?: string | null;
  lastDestination?: string | null;
}): GuestIntel {
  return {
    displayName: g.displayName || null,
    travelerType: g.travelerType || null,
    budgetBand: g.budgetBand || null,
    interests: g.interests || [],
    companions: g.companions || null,
    homeCity: g.homeCity || null,
    healthNotes: g.healthNotes || null,
    careNeeds: g.careNeeds || [],
    preferences: g.preferences || [],
    pace: g.pace || null,
    memorySummary: g.memorySummary || null,
    lastDestination: g.lastDestination || null,
  };
}

export function intelIsThin(g: GuestIntel) {
  return !g.healthNotes && !g.companions && g.careNeeds.length === 0 && !g.memorySummary;
}

/** Instant signals from Arabic/English chat — does not wait on the model. */
export function heuristicIntel(conversation: string): GuestIntel {
  const t = conversation;
  const care: string[] = [];
  const interests: string[] = [];
  const prefs: string[] = [];
  const health: string[] = [];

  const knee = /ركب|ركبة|knee|مفصل|joints?/i.test(t);
  const pain = /توجع|وجع|يؤلم|الم|pain|hurt|sore|injury|إصابة/i.test(t);
  if (knee) {
    care.push("knee / joint pain");
    health.push(
      pain
        ? "Knee/joint pain mentioned — keep stairs, long walks, and steep paths light"
        : "Possible knee/joint sensitivity"
    );
    prefs.push("avoid long stair climbs", "spa / thermal access close to room");
  }
  if (/سلالم|درج|stairs|mobility|كرسي متحرك|wheelchair|عكاز/i.test(t)) {
    care.push("mobility / stairs");
    prefs.push("slow walking pace", "ground-floor or elevator access");
  }
  if (/ظهر|back pain|spine/i.test(t)) {
    care.push("back pain");
    health.push("Back discomfort — prefer supportive beds and limited hiking");
  }
  if (/حساسية|allerg/i.test(t)) {
    care.push("allergies");
    health.push("Allergy mentioned — confirm food/environment with kitchen");
  }
  if (/حامل|pregnan/i.test(t)) {
    care.push("pregnancy");
    prefs.push("gentle pace", "no extreme heat hikes");
  }
  if (/سكر|diabetes/i.test(t)) {
    care.push("diabetes");
  }
  if (/أطفال|kids|children|طفل|baby/i.test(t)) {
    care.push("traveling with children");
    interests.push("family-friendly");
  }
  if (/حمامات|ينابيع|hot spring|thermal|spa|استرخ|علاج|ماعين/i.test(t)) {
    interests.push("wellness", "hot springs");
    prefs.push("thermal / spa stay");
  }
  if (/بحر الميت|dead sea|طفو/i.test(t)) interests.push("Dead Sea", "wellness");
  if (/بترا|petra/i.test(t)) interests.push("history", "Petra");
  if (/وادي رم|wadi rum/i.test(t)) interests.push("desert", "Wadi Rum");
  if (/طعام|food|مطعم|أكل/i.test(t)) interests.push("food");
  if (/طبيعة|nature|hiking|مشي/i.test(t) && !knee) interests.push("nature");

  let companions: string | null = null;
  const skipName = /حمامات|البحر|عمان|الأردن|الاردن|رحلة|فندق|السلام|السبا|hot|spring/i;
  const withMatch = t.match(
    /(?:أنا و|انا و|مع|with)\s*([A-Za-z\u0600-\u06FF]{2,24})/i
  );
  const namedPeople = t.match(/\b(بشار|bashar|أحمد|احمد|محمد|علي|سارة|ليان|omar|ahmad)\b/i);
  if (namedPeople) companions = namedPeople[1];
  else if (withMatch?.[1] && !skipName.test(withMatch[1])) companions = withMatch[1];

  let travelerType: string | null = null;
  if (companions || /صحاب|friends|وبشار|أنا و|انا و/i.test(t)) travelerType = "FRIENDS";
  if (/زوج|مرتي|زوجتي|wife|husband|couple|خطيبي|خطيبتي/i.test(t)) travelerType = "COUPLE";
  if (/أطفال|family|عيلتي|عائلتي/i.test(t)) travelerType = "FAMILY";
  if (/لحالي|وحدي|solo|alone/i.test(t)) travelerType = "SOLO";

  let dest: string | null = null;
  if (/ماعين|ma'?in|hammamat/i.test(t)) dest = "Ma'in, Jordan";
  else if (/بحر الميت|dead sea/i.test(t)) dest = "Dead Sea, Jordan";
  else if (/بترا|petra/i.test(t)) dest = "Petra, Jordan";
  else if (/وادي رم|wadi rum/i.test(t)) dest = "Wadi Rum, Jordan";
  else if (/عمان|amman/i.test(t)) dest = "Amman, Jordan";
  else if (/الأردن|الاردن|jordan/i.test(t)) dest = "Jordan";

  const pace = care.some((c) => /knee|mobility|back|pregnan/i.test(c))
    ? "slow / restorative"
    : /hiking|adventure|نشيط/i.test(t)
      ? "active"
      : null;

  const memoryBits = [
    companions ? `Traveling with ${companions} (${travelerType || "friends"}).` : travelerType ? `Traveler type: ${travelerType}.` : "",
    health[0] || "",
    dest ? `Planning ${dest}.` : "",
    interests.length ? `Interested in ${uniq(interests).join(", ")}.` : "",
    prefs[0] ? `Hotel should: ${uniq(prefs).slice(0, 3).join("; ")}.` : "",
  ].filter(Boolean);

  return {
    displayName: null,
    travelerType,
    budgetBand: /فخم|luxury|5\s*star/i.test(t)
      ? "LUXURY"
      : /رخيص|budget|وفير/i.test(t)
        ? "BUDGET"
        : null,
    interests: uniq(interests),
    companions,
    homeCity: null,
    healthNotes: health.join(". ") || null,
    careNeeds: uniq(care),
    preferences: uniq(prefs),
    pace,
    memorySummary: memoryBits.join(" ") || null,
    lastDestination: dest,
  };
}

export function buildIntelExtractPrompt(conversation: string) {
  return `You are Voyara's silent guest-intelligence analyst for hotels and the platform owner.
Read this WhatsApp travel chat. Infer ONLY what the traveler actually said or clearly implied.
Do not invent a name, city, or medical condition they did not hint at.
If someone else's body part hurts (e.g. "Bashar's knee"), record that as companion care, not the speaker's own injury.

Return ONLY JSON:
{
  "displayName": "first name if they said it, else null",
  "travelerType": "SOLO|COUPLE|FAMILY|FRIENDS|null",
  "budgetBand": "BUDGET|MID|LUXURY|null",
  "interests": ["wellness","hot springs"],
  "companions": "names or relation, or null",
  "homeCity": "null unless said",
  "healthNotes": "who has what issue, how hotel/trip should adapt, or null",
  "careNeeds": ["knee / joint pain","limit stairs"],
  "preferences": ["slow pace","spa next to room"],
  "pace": "slow / restorative | normal | active | null",
  "memorySummary": "4-6 sentences for staff: who they are with, why they are traveling, health/care, destination, pace, what would make this stay feel personally cared for",
  "lastDestination": "English place name or null"
}
Conversation:
${conversation.slice(0, 7000)}`;
}

export function mergeIntel(base: GuestIntel, extra: Partial<GuestIntel>): GuestIntel {
  return {
    displayName: extra.displayName || base.displayName,
    travelerType: extra.travelerType || base.travelerType,
    budgetBand: extra.budgetBand || base.budgetBand,
    interests: uniq([...(base.interests || []), ...(extra.interests || [])]),
    companions: extra.companions || base.companions,
    homeCity: extra.homeCity || base.homeCity,
    healthNotes: pickRicher(extra.healthNotes, base.healthNotes),
    careNeeds: uniq([...(base.careNeeds || []), ...(extra.careNeeds || [])]),
    preferences: uniq([...(base.preferences || []), ...(extra.preferences || [])]),
    pace: extra.pace || base.pace,
    memorySummary: pickRicher(extra.memorySummary, base.memorySummary),
    lastDestination: extra.lastDestination || base.lastDestination,
  };
}

async function persistIntel(guestId: string, intel: GuestIntel) {
  const existing = await db.whatsAppGuest.findUnique({ where: { id: guestId } });
  if (!existing) return intel;
  const merged = mergeIntel(intelFromGuest(existing), intel);
  try {
    await db.whatsAppGuest.update({
      where: { id: guestId },
      data: {
        displayName: merged.displayName || undefined,
        travelerType: merged.travelerType || undefined,
        budgetBand: merged.budgetBand || undefined,
        interests: merged.interests,
        companions: merged.companions || undefined,
        homeCity: merged.homeCity || undefined,
        healthNotes: merged.healthNotes || undefined,
        careNeeds: merged.careNeeds,
        preferences: merged.preferences,
        pace: merged.pace || undefined,
        memorySummary: merged.memorySummary || undefined,
        lastDestination: merged.lastDestination || undefined,
      },
    });
  } catch (err) {
    console.error("persist guest intel failed", err);
  }
  return merged;
}

export async function applyHeuristicIntel(guestId: string, conversation: string) {
  if (conversation.trim().length < 8) return null;
  return persistIntel(guestId, heuristicIntel(conversation));
}

export async function learnGuestFromConversation(
  guestId: string,
  conversation: string,
  opts?: { deep?: boolean }
) {
  const deep = opts?.deep !== false;
  let intel = heuristicIntel(conversation);
  if (deep && conversation.trim().length >= 12) {
    try {
      const { text } = await generateText({
        model: deepseek.chat(deepseekModel),
        prompt: buildIntelExtractPrompt(conversation),
      });
      const raw = extractJsonObject(text) as Partial<GuestIntel> & Record<string, unknown>;
      intel = mergeIntel(intel, {
        displayName: clean(raw.displayName),
        travelerType: asTravelerType(raw.travelerType),
        budgetBand: asBudget(raw.budgetBand),
        interests: Array.isArray(raw.interests) ? raw.interests.map(String) : [],
        companions: clean(raw.companions),
        homeCity: clean(raw.homeCity),
        healthNotes: clean(raw.healthNotes),
        careNeeds: Array.isArray(raw.careNeeds) ? raw.careNeeds.map(String) : [],
        preferences: Array.isArray(raw.preferences) ? raw.preferences.map(String) : [],
        pace: clean(raw.pace),
        memorySummary: clean(raw.memorySummary),
        lastDestination: clean(raw.lastDestination),
      });
    } catch (err) {
      console.error("guest intel llm failed, keeping heuristics", err);
    }
  }
  return persistIntel(guestId, intel);
}

export async function learnGuestFromTrip(guestId: string, tripId: string, opts?: { deep?: boolean }) {
  const history = await db.chatMessage.findMany({
    where: { tripId },
    orderBy: { createdAt: "asc" },
    take: 24,
  });
  const convo = history
    .map((m) => `${m.role === "user" ? "Traveler" : "Voyara"}: ${m.content}`)
    .join("\n");
  if (convo.trim().length < 8) return null;
  return learnGuestFromConversation(guestId, convo, opts);
}

/** Fill empty CRM rows from stored chat (admin/hotel dashboards). Heuristic only — fast. */
export async function hydrateThinGuestIntel(
  guestId: string,
  conversation: string
) {
  if (conversation.trim().length < 12) return null;
  const existing = await db.whatsAppGuest.findUnique({ where: { id: guestId } });
  if (!existing) return null;
  if (!intelIsThin(intelFromGuest(existing))) return intelFromGuest(existing);
  return applyHeuristicIntel(guestId, conversation);
}

export function hotelStaffBrief(g: GuestIntel) {
  const staffNote = [
    g.companions ? `Traveling with ${g.companions}` : null,
    g.healthNotes,
    g.pace ? `Pace: ${g.pace}` : null,
    g.preferences.slice(0, 2).length ? `Prefer ${g.preferences.slice(0, 2).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    travelingWith: g.companions,
    careNeeds: g.careNeeds.slice(0, 4),
    healthNotes: g.healthNotes,
    pace: g.pace,
    preferences: g.preferences.slice(0, 4),
    interests: g.interests.slice(0, 4),
    travelerType: g.travelerType,
    staffNote: staffNote || null,
  };
}

export function silentCareBlock(g: GuestIntel) {
  const lines = [
    g.companions ? `- Companion: ${g.companions}` : "",
    g.travelerType ? `- Traveler type: ${g.travelerType}` : "",
    g.budgetBand ? `- Budget: ${g.budgetBand}` : "",
    g.healthNotes ? `- Health / care: ${g.healthNotes}` : "",
    g.careNeeds.length ? `- Care flags: ${g.careNeeds.join(", ")}` : "",
    g.preferences.length ? `- Preferences: ${g.preferences.join(", ")}` : "",
    g.pace ? `- Pace: ${g.pace}` : "",
    g.interests.length ? `- Interests: ${g.interests.join(", ")}` : "",
    g.memorySummary ? `- Memory: ${g.memorySummary}` : "",
  ].filter(Boolean);
  return lines.length
    ? `Known silently from prior chat (NEVER quiz them, NEVER say you saved a profile):\n${lines.join("\n")}`
    : "No guest file yet. Listen. If they mention a companion, health, budget, or pace, use it immediately.";
}
