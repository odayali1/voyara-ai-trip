export type ReplyLanguage = "ar" | "en" | "zh" | "other";

const ARABIC = /[\u0600-\u06FF]/;
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN = /[A-Za-z]/;

/** Decide UI/AI language from the traveler message — never invent Chinese. */
export function detectReplyLanguage(text: string): ReplyLanguage {
  const sample = (text || "").slice(0, 800);
  const arabic = (sample.match(new RegExp(ARABIC, "g")) || []).length;
  const cjk = (sample.match(new RegExp(CJK, "g")) || []).length;
  const latin = (sample.match(new RegExp(LATIN, "g")) || []).length;

  // Only Chinese if the user actually wrote CJK and it dominates
  if (cjk >= 8 && cjk > arabic && cjk >= latin) return "zh";
  if (arabic >= 4 && arabic >= latin) return "ar";
  if (latin >= 3) return "en";
  if (arabic > 0) return "ar";
  return "en";
}

export function languageLabel(lang: ReplyLanguage): string {
  switch (lang) {
    case "ar":
      return "Arabic";
    case "zh":
      return "Chinese";
    case "other":
      return "the same language as the user request";
    default:
      return "English";
  }
}

export function containsCjk(text: string): boolean {
  return CJK.test(text || "");
}

/** True when plan text is Chinese but the user did not ask in Chinese. */
export function planHasWrongLanguage(
  plan: {
    title?: string;
    summary?: string;
    days?: Array<{ title?: string; notes?: string; stops?: Array<{ title?: string; tips?: string }> }>;
  },
  userLang: ReplyLanguage
): boolean {
  if (userLang === "zh") return false;
  const bits = [
    plan.title,
    plan.summary,
    ...(plan.days || []).flatMap((d) => [
      d.title,
      d.notes,
      ...(d.stops || []).flatMap((s) => [s.title, s.tips]),
    ]),
  ]
    .filter(Boolean)
    .join(" ");
  return containsCjk(bits);
}
