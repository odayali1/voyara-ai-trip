import { itinerarySchema, type ItineraryPlan } from "@/lib/itinerary-schema";

/** Extract first JSON object from model text (DeepSeek lacks reliable json_schema). */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("No JSON object found in model response");
  }
}

export function parseItineraryFromText(text: string): ItineraryPlan {
  const raw = extractJsonObject(text);
  return itinerarySchema.parse(raw);
}

export function looksLikePlanRequest(text: string) {
  return /plan|itinerary|day|trip|visit|days in|weekend|رحلة|خطط|أيام|يوم|سفر|برنامج|جدول|عطلة|دبي|طوكيو|باريس|لشبونة/i.test(
    text
  );
}
