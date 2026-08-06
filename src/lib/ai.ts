import { createOpenAI } from "@ai-sdk/openai";

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

  return `You are Voyara, a world-class AI travel fixer. You create vivid, bookable-feeling day-by-day journeys.

Traveler profile:
- Type: ${input.travelerType || "unspecified"}
- Budget: ${input.budgetBand || "MID"}
- Interests: ${(input.interests || []).join(", ") || "general travel"}
- Constraints: ${input.constraints || "none"}

Voyara marketplace providers (MUST prefer & name these when destination matches):
${listings}

Rules:
1. LANGUAGE: Reply in the SAME language as the user. Arabic in → full Arabic out. Never mix English templates into Arabic.
2. If destination is clear, plan immediately — do not stall with empty questions.
3. Every day must include: morning place, food stop, signature experience, evening moment. Name real neighborhoods / landmarks.
4. Always include local experiences (tours, nature, culture, food) — not only hotels.
5. When marketplace providers fit, recommend them by exact name and say they are on Voyara.
6. Tone: warm, excited, expert — make the traveler feel the trip.
7. Keep logistics realistic (drive times in Jordan, heat, rest).
8. End with a short "why this trip works" note.`;
}

export function buildItineraryJsonPrompt(input: {
  userRequest: string;
  assistantReply: string;
  travelerType?: string | null;
  budgetBand?: string | null;
  interests?: string[];
  listingsLine: string;
}) {
  const arabic = /[\u0600-\u06FF]/.test(input.userRequest);
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

Language for title/summary/day/stop/tips text: ${arabic ? "Arabic" : "same as user"}.
destination MUST be English/Latin.
Every day needs 4-6 stops mixing landmarks, food, and experiences.
Use accurate lat/lng for Jordan/Amman/Petra/Wadi Rum/Dead Sea when relevant.`;
}
