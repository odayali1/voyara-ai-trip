import { geocodePlace, type GeoPoint } from "@/lib/geo";

export type PlaceRef = {
  title: string;
  city: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
};

const REGIONS: Array<{ id: string; countrycodes: string; keys: string[] }> = [
  {
    id: "jordan",
    countrycodes: "jo",
    keys: [
      "jordan",
      "amman",
      "petra",
      "wadi rum",
      "dead sea",
      "ma'in",
      "main",
      "maeen",
      "aqaba",
      "madaba",
      "jerash",
      "ajloun",
      "irbid",
      "sweimeh",
      "swemeh",
      "الاردن",
      "الأردن",
      "عمان",
      "البترا",
      "البتراء",
      "وادي رم",
      "البحر الميت",
      "ماعين",
      "حمامات",
      "العقبة",
      "مادبا",
      "جرش",
    ],
  },
  {
    id: "tokyo",
    countrycodes: "jp",
    keys: ["tokyo", "japan", "asakusa", "kyoto", "osaka", "طوكيو", "اليابان"],
  },
  {
    id: "lisbon",
    countrycodes: "pt",
    keys: ["lisbon", "portugal", "porto", "لشبونة"],
  },
  {
    id: "dubai",
    countrycodes: "ae",
    keys: ["dubai", "uae", "abu dhabi", "دبي"],
  },
];

const GAZETTEER: Array<{ keys: string[]; lat: number; lng: number; label: string }> = [
  { keys: ["حمامات ماعين", "حمامات", "ماعين", "hammamat ma'in", "ma'in", "main hot springs", "maeen"], lat: 31.6088, lng: 35.6103, label: "Ma'in Hot Springs, Jordan" },
  { keys: ["البحر الميت", "dead sea", "sweimeh", "swemeh", "سويمة"], lat: 31.717, lng: 35.585, label: "Dead Sea, Jordan" },
  { keys: ["عمان", "amman citadel", "amman"], lat: 31.9539, lng: 35.9106, label: "Amman, Jordan" },
  { keys: ["البترا", "البتراء", "petra", "siq"], lat: 30.3285, lng: 35.4444, label: "Petra, Jordan" },
  { keys: ["وادي رم", "wadi rum"], lat: 29.532, lng: 35.42, label: "Wadi Rum, Jordan" },
  { keys: ["العقبة", "aqaba"], lat: 29.5267, lng: 35.0078, label: "Aqaba, Jordan" },
  { keys: ["مادبا", "madaba"], lat: 31.716, lng: 35.794, label: "Madaba, Jordan" },
  { keys: ["جبل نيبو", "mount nebo"], lat: 31.768, lng: 35.726, label: "Mount Nebo, Jordan" },
  { keys: ["جرش", "jerash"], lat: 32.2808, lng: 35.8913, label: "Jerash, Jordan" },
];

function fold(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .trim();
}

export function regionForText(text: string) {
  const t = fold(text);
  return REGIONS.find((r) => r.keys.some((k) => t.includes(k))) || null;
}

export function inferDestination(text: string, fallback?: string | null) {
  const region = regionForText(text);
  if (region?.id === "jordan") {
    if (/ماعين|ma'?in|maeen|hammamat/i.test(text)) return "Ma'in, Jordan";
    if (/بحر الميت|dead sea/i.test(text)) return "Dead Sea, Jordan";
    if (/بترا|petra/i.test(text)) return "Petra, Jordan";
    if (/وادي رم|wadi rum/i.test(text)) return "Wadi Rum, Jordan";
    if (/عمان|amman/i.test(text)) return "Amman, Jordan";
    return "Jordan";
  }
  if (region?.id === "tokyo") return "Tokyo";
  if (region?.id === "lisbon") return "Lisbon";
  if (region?.id === "dubai") return "Dubai";
  const fb = (fallback || "").trim();
  if (fb && fb !== "TBD") return fb;
  return "";
}

export function listingFitsDestination(listing: PlaceRef, destination: string) {
  const destRegion = regionForText(`${destination} ${listing.city} ${listing.country}`);
  const listingRegion = regionForText(`${listing.city} ${listing.country} ${listing.title}`);
  const dest = regionForText(destination);
  if (dest && listingRegion) return dest.id === listingRegion.id;
  if (dest && destRegion) return dest.id === destRegion.id;
  const d = fold(destination);
  const city = fold(listing.city);
  const country = fold(listing.country);
  if (!d) return false;
  return d.includes(city) || city.includes(d.split(",")[0] || d) || d.includes(country) || country.includes(d);
}

export function lookupKnownPlace(title: string, _destination?: string): GeoPoint | null {
  const t = fold(title);
  if (!t) return null;
  const hit = GAZETTEER.find((g) => g.keys.some((k) => t.includes(fold(k))));
  if (!hit) return null;
  return { lat: hit.lat, lng: hit.lng, displayName: hit.label };
}

export function destinationAnchor(destination: string): GeoPoint | null {
  return lookupKnownPlace(destination, destination);
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function geocodeInDestination(query: string, destination: string): Promise<GeoPoint | null> {
  const known = lookupKnownPlace(query, destination);
  if (known) return known;
  const region = regionForText(destination) || regionForText(query);
  const geo = await geocodePlace(`${query}, ${destination}`, {
    countrycodes: region?.countrycodes,
  });
  const anchor = destinationAnchor(destination) || (await geocodePlace(destination, { countrycodes: region?.countrycodes }));
  if (!geo) return null;
  if (anchor && haversineKm(geo, anchor) > 180) return null;
  return geo;
}
