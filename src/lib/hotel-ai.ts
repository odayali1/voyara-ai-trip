import { z } from "zod";

export const hotelRoomDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  priceFrom: z.number().nullable().optional(),
  currency: z.string().optional(),
  tags: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  bedType: z.string().optional(),
  capacity: z.number().optional(),
});

export type HotelRoomDraft = z.infer<typeof hotelRoomDraftSchema>;

export function buildHotelExtractPrompt(input: {
  documentText: string;
  hotelName?: string;
  city?: string;
  country?: string;
}) {
  return `You are Voyara's hotel catalog AI. Extract guest rooms / stay offers from this hotel document into clean structured JSON.

Hotel context:
- Name: ${input.hotelName || "Unknown hotel"}
- City: ${input.city || ""}
- Country: ${input.country || ""}

Document:
"""
${input.documentText.slice(0, 14000)}
"""

Return ONLY valid JSON (no markdown fences):
{
  "hotelName": "string",
  "city": "string",
  "country": "string",
  "rooms": [
    {
      "title": "Deluxe King Room",
      "description": "2-3 sentence guest-facing description",
      "city": "Amman",
      "country": "Jordan",
      "priceFrom": 120,
      "currency": "USD",
      "bedType": "King",
      "capacity": 2,
      "tags": ["city-view", "breakfast"],
      "amenities": ["wifi", "ac", "minibar"]
    }
  ]
}

Rules:
1. Language: English (unless document is clearly Arabic — then Arabic).
2. Extract every distinct room type / package / suite you can find.
3. If price missing, use null.
4. Fill city/country from context when missing in a row.
5. Max 20 rooms.
6. Never invent a fake luxury hotel brand — stay faithful to the document.`;
}

export function parseHotelExtract(text: string): {
  hotelName?: string;
  city?: string;
  country?: string;
  rooms: HotelRoomDraft[];
} {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const json = JSON.parse(candidate.slice(start, end + 1)) as {
    hotelName?: string;
    city?: string;
    country?: string;
    rooms?: unknown[];
  };

  const rooms = (json.rooms || [])
    .map((r) => {
      const parsed = hotelRoomDraftSchema.safeParse(r);
      return parsed.success ? parsed.data : null;
    })
    .filter((r): r is HotelRoomDraft => Boolean(r));

  return {
    hotelName: json.hotelName,
    city: json.city,
    country: json.country,
    rooms,
  };
}
