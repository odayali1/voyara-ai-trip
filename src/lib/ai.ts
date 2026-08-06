import { createOpenAI } from "@ai-sdk/openai";
import { detectReplyLanguage, languageLabel, type ReplyLanguage } from "@/lib/language";

export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

export const deepseekModel =
  process.env.DEEPSEEK_MODEL || "deepseek-chat";

export function buildPlannerSystemPrompt(input: {
  travelerType?: string | null;
  budgetBand?: string | null;
  interests?: string[];
  constraints?: string | null;
  providerListings?: Array<{
    id: string;
    title: string;
    category: string;
    city: string;
    description: string;
    priceFrom?: number | null;
  }>;
  replyLanguage?: ReplyLanguage;
}) {
  const listings =
    input.providerListings && input.providerListings.length > 0
      ? input.providerListings
          .map(
            (l) =>
              `- [${l.id}] ${l.title} (${l.category}) in ${l.city}: ${l.description}${
                l.priceFrom != null ? ` from $${l.priceFrom}` : ""
              }`
          )
          .join("\n")
      : "None available yet.";

  const lang = languageLabel(input.replyLanguage || "en");

  return `You are Voyara, a world-class AI travel fixer. You create vivid, bookable-feeling day-by-day journeys.

Traveler profile:
- Type: ${input.travelerType || "unspecified"}
- Budget: ${input.budgetBand || "MID"}
- Interests: ${(input.interests || []).join(", ") || "general travel"}
- Constraints: ${input.constraints || "none"}

Voyara marketplace providers (MUST prefer & name these when destination matches):
${listings}

Rules:
1. LANGUAGE (CRITICAL): Write the ENTIRE reply in ${lang} only.
   - English user → English only. Arabic user → Arabic only.
   - NEVER use Chinese, Japanese, or Korean unless the user wrote in that language.
   - Place names may stay in local Latin spelling (Petra, Amman) inside ${lang} sentences.
2. If destination is clear, plan immediately — do not stall with empty questions.
3. Every day must include: morning place, food stop, signature experience, evening moment. Name real neighborhoods / landmarks.
4. Always include local experiences (tours, nature, culture, food) — not only hotels.
5. When marketplace providers fit, recommend them by exact name and say they are on Voyara.
6. Tone: warm, excited, expert — make the traveler feel the trip.
7. Keep logistics realistic (drive times in Jordan, heat, rest).
8. End with a short "why this trip works" note.
9. FORMAT with clean Markdown the UI can render:
   - One H1 title, then each day as ## Day N: Title
   - Use **bold** for place names (real Markdown bold, not bare asterisks)
   - Use short bullet lists for morning / midday / evening when helpful
   - Separate days with a horizontal rule ---
   - Keep paragraphs short (2–4 lines). No giant walls of text.
   - Do NOT wrap the whole reply in a code fence.`;
}

export function buildItineraryJsonPrompt(input: {
  userRequest: string;
  assistantReply: string;
  travelerType?: string | null;
  budgetBand?: string | null;
  interests?: string[];
  listingsLine: string;
  replyLanguage?: ReplyLanguage;
  forceEnglish?: boolean;
}) {
  const lang = input.forceEnglish
    ? "en"
    : input.replyLanguage || detectReplyLanguage(input.userRequest);
  const langName = languageLabel(lang);

  return `Convert this travel conversation into ONE JSON object for a map itinerary packed with real places & experiences.

User request:
${input.userRequest}

Assistant reply:
${input.assistantReply}

Traveler type: ${input.travelerType || "COUPLE"}
Budget: ${input.budgetBand || "MID"}
Interests: ${(input.interests || []).join(", ") || "nature, food, culture"}
Prefer these Voyara listings when relevant: ${input.listingsLine || "none"}

Return ONLY valid JSON (no markdown) with this shape:
{
  "title": "string",
  "destination": "string (English Latin for maps, e.g. Jordan or Amman)",
  "summary": "string",
  "days": [
    {
      "dayNumber": 1,
      "title": "string",
      "notes": "string",
      "stops": [
        {
          "title": "string",
          "time": "09:00",
          "category": "attraction|food|hotel|activity|experience|nature",
          "address": "string",
          "lat": 31.9539,
          "lng": 35.9106,
          "tips": "string",
          "estimatedCost": 40,
          "currency": "USD"
        }
      ]
    }
  ]
}

LANGUAGE (CRITICAL — zero exceptions):
- title, summary, day.title, day.notes, stop.title, stop.tips, stop.address MUST be written in ${langName}.
- destination MUST stay English/Latin (Jordan, Amman, Petra…).
- FORBIDDEN unless user language is Chinese: any Chinese/Japanese/Korean characters (汉字/仮名/한글).
- Do not translate an English trip into Chinese. Match the user language exactly.
- Example English titles: "Amman — First Taste", "Petra Canyon Day".

Every day needs 4-6 stops mixing landmarks, food, and experiences.
Use accurate lat/lng for Jordan/Amman/Petra/Wadi Rum/Dead Sea when relevant.`;
}
