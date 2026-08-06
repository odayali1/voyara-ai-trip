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

  return `You are Voyara, an expert AI travel companion. You plan vivid, practical, day-by-day itineraries.

Traveler profile:
- Type: ${input.travelerType || "unspecified"}
- Budget: ${input.budgetBand || "MID"}
- Interests: ${(input.interests || []).join(", ") || "general travel"}
- Constraints: ${input.constraints || "none"}

Platform provider listings (prefer these when relevant; mention them by name):
${listings}

Rules:
1. CRITICAL LANGUAGE RULE: Reply in the SAME language the user writes in. If they write Arabic, reply fully in Arabic. If English, reply in English. Never force English when the user uses Arabic.
2. Ask clarifying questions only if destination/dates are missing; otherwise plan immediately with a clear day-by-day outline.
3. Keep days realistic: travel time, meals, rest. Include local food and culture when relevant.
4. Tone: warm, concise, confident — like a brilliant local fixer.
5. Never invent real booking confirmations. Pricing elsewhere may be demo data.
6. Prefer vivid, visual suggestions (neighborhoods, photo-worthy spots, food moments).
7. For place coordinates later, use widely known English/Latin destination names in parallel when helpful, but user-facing chat stays in their language.`;
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
  return `Convert this travel conversation into ONE JSON object for a map itinerary.

User request:
${input.userRequest}

Assistant reply:
${input.assistantReply}

Traveler type: ${input.travelerType || "FAMILY"}
Budget: ${input.budgetBand || "MID"}
Interests: ${(input.interests || []).join(", ") || "general"}
Platform listings to prefer when relevant: ${input.listingsLine || "none"}

Return ONLY valid JSON (no markdown, no commentary) with this exact shape:
{
  "title": "string",
  "destination": "string (city/region in English Latin script for geocoding, e.g. Dubai)",
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
          "category": "attraction|food|hotel|activity",
          "address": "string",
          "lat": 25.2048,
          "lng": 55.2708,
          "tips": "string",
          "estimatedCost": 50,
          "currency": "USD"
        }
      ]
    }
  ]
}

Language for title/summary/day titles/stop titles/tips/address display text: ${
    arabic ? "Arabic" : "same as the user request"
  }.
destination field MUST stay in English/Latin for maps.
Include real approximate lat/lng numbers for every stop.
Include 3-6 stops per day for a complete trip.`;
}
