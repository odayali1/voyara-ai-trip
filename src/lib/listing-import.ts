import type { ListingCategory } from "@prisma/client";

const CATEGORIES = new Set<ListingCategory>([
  "HOTEL",
  "RESTAURANT",
  "TOUR",
  "ACTIVITY",
  "TRANSPORT",
  "EXPERIENCE",
]);

export type ImportedListing = {
  title: string;
  category: ListingCategory;
  description: string;
  city: string;
  country: string;
  priceFrom: number | null;
  tags: string[];
  amenities: string[];
  images: string[];
};

function normalizeCategory(raw: string): ListingCategory {
  const c = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (CATEGORIES.has(c as ListingCategory)) return c as ListingCategory;
  if (/hotel|room|stay|riad|resort/i.test(raw)) return "HOTEL";
  if (/rest|food|cafe|dining/i.test(raw)) return "RESTAURANT";
  if (/tour|trip|guide|package/i.test(raw)) return "TOUR";
  if (/transport|transfer|driver|car/i.test(raw)) return "TRANSPORT";
  if (/activ/i.test(raw)) return "ACTIVITY";
  return "EXPERIENCE";
}

function splitList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function rowToListing(row: Record<string, unknown>): ImportedListing | null {
  const title = String(row.title || row.name || row.room || row.service || "").trim();
  const city = String(row.city || row.location || "").trim();
  const country = String(row.country || "").trim();
  if (!title || !city || !country) return null;

  const priceRaw = row.priceFrom ?? row.price ?? row.rate ?? null;
  const priceFrom =
    priceRaw == null || priceRaw === ""
      ? null
      : Number(String(priceRaw).replace(/[^0-9.]/g, ""));

  return {
    title,
    category: normalizeCategory(String(row.category || row.type || "EXPERIENCE")),
    description: String(row.description || row.details || row.summary || title),
    city,
    country,
    priceFrom: Number.isFinite(priceFrom as number) ? (priceFrom as number) : null,
    tags: splitList(row.tags || row.tag),
    amenities: splitList(row.amenities || row.facilities || row.rooms),
    images: splitList(row.images || row.image || row.photo || row.photos),
  };
}

/** Parse CSV with header row. Supports commas inside quotes. */
export function parseCsvListings(text: string): ImportedListing[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const out: ImportedListing[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    const item = rowToListing(row);
    if (item) out.push(item);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

export function parseJsonListings(text: string): ImportedListing[] {
  const data = JSON.parse(text) as unknown;
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { listings?: unknown }).listings)
      ? (data as { listings: unknown[] }).listings
      : Array.isArray((data as { items?: unknown }).items)
        ? (data as { items: unknown[] }).items
        : null;
  if (!rows) throw new Error("JSON must be an array or { listings: [] }");

  return rows
    .map((r) => rowToListing((r || {}) as Record<string, unknown>))
    .filter((x): x is ImportedListing => Boolean(x));
}

export function parseCatalogFile(filename: string, text: string): ImportedListing[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return parseJsonListings(text);
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return parseCsvListings(text);
  // Heuristic
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return parseJsonListings(text);
  return parseCsvListings(text);
}
