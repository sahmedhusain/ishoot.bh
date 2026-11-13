export const LANGUAGES = [
  {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  {
    code: "ar",
    name: "العربية",
    direction: "rtl",
  },
] as const;

export type Locale = "en" | "ar";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (value === "en" || value === "ar");
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ar";
}
