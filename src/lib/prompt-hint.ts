/** Build a natural planner prompt from a landing/query hint — never mangling Arabic. */
export function buildPromptFromHint(hint: string): string {
  const q = hint.trim();
  if (!q) return "";

  const hasArabic = /[\u0600-\u06FF]/.test(q);
  const looksLikeSentence =
    q.length > 28 ||
    /\s/.test(q) ||
    /[?!.,،؟]/.test(q) ||
    /plan|trip|visit|weekend|days|رحلة|خطط|بدي|اروح|أريد|عايز/i.test(q);

  // Freeform / Arabic / full sentences: use exactly what the traveler wrote
  if (hasArabic || looksLikeSentence) {
    return q;
  }

  // Short city chip like "Tokyo"
  return `Plan a 5-day trip to ${q} focused on food, culture, and local experiences.`;
}
