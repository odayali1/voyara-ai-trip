export function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function textDirection(text: string): "rtl" | "ltr" {
  return hasArabic(text) ? "rtl" : "ltr";
}
