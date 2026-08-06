/** Rough map centers so the map flies to the destination while the plan loads. */
const FOCI: Array<{ match: RegExp; center: [number, number]; zoom: number }> = [
  { match: /jordan|الأردن|اردن|amman|عمّان|عمان|petra|البترا|wadi rum|وادي رم/i, center: [36.2, 31.0], zoom: 6.2 },
  { match: /tokyo|japan|طوكيو|اليابان/i, center: [139.69, 35.68], zoom: 10 },
  { match: /lisbon|portugal|لشبونة/i, center: [-9.14, 38.72], zoom: 11 },
  { match: /bali|indonesia/i, center: [115.19, -8.41], zoom: 9 },
  { match: /dubai|uae|دبي/i, center: [55.27, 25.2], zoom: 10 },
  { match: /paris|france|باريس/i, center: [2.35, 48.86], zoom: 11 },
  { match: /rome|italy|روما/i, center: [12.5, 41.9], zoom: 11 },
];

export function destinationFocus(text?: string | null): {
  center: [number, number];
  zoom: number;
} | null {
  if (!text?.trim()) return null;
  for (const f of FOCI) {
    if (f.match.test(text)) return { center: f.center, zoom: f.zoom };
  }
  return null;
}
