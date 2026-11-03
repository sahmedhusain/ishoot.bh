// The languages a company writes its content in. Every bilingual field is stored as an English/Arabic pair
// (titleEn/titleAr, name_en/name_ar); a company that writes in one language fills one side, and the other side
// is kept identical so every page, document and email that reads either column shows that text.

// Spelled out (not derived from the list) so the server-action input contracts can read it.
export type ContentLanguage = "ar" | "en";
export const CONTENT_LANGUAGES: readonly ContentLanguage[] = ["ar", "en"];

export function isContentLanguage(value: unknown): value is ContentLanguage {
  return value === "ar" || value === "en";
}

/** A valid, de-duplicated language list in the canonical order; both languages when the input is unusable. */
export function normalizeLanguages(value: unknown): ContentLanguage[] {
  const list = Array.isArray(value) ? value.filter(isContentLanguage) : [];
  const unique = CONTENT_LANGUAGES.filter((language) =>
    list.includes(language),
  );
  return unique.length ? unique : [...CONTENT_LANGUAGES];
}

/** The language shown first: the requested one when the company writes in it, otherwise its first language. */
export function normalizePrimaryLanguage(
  value: unknown,
  languages: readonly ContentLanguage[],
): ContentLanguage {
  return isContentLanguage(value) && languages.includes(value)
    ? value
    : languages[0];
}

const PAIRS: [RegExp, (stem: string) => [string, string]][] = [
  [/^(.*)(?:En|Ar)$/, (stem) => [`${stem}En`, `${stem}Ar`]],
  [/^(.*)_(?:en|ar)$/, (stem) => [`${stem}_en`, `${stem}_ar`]],
];

/**
 * With a single content language, copies each English/Arabic pair from the written side to the other side,
 * through nested objects and arrays. With both languages the value is returned unchanged.
 */
export function mirrorBilingual<T>(
  value: T,
  languages: readonly ContentLanguage[],
): T {
  if (languages.length !== 1) return value;
  const source = languages[0];
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node)) out[key] = visit(child);
    for (const key of Object.keys(out)) {
      for (const [pattern, pair] of PAIRS) {
        const stem = key.match(pattern)?.[1];
        if (stem === undefined) continue;
        const [en, ar] = pair(stem);
        const [from, to] = source === "en" ? [en, ar] : [ar, en];
        if (
          typeof out[from] === "string" &&
          (out[to] === undefined ||
            typeof out[to] === "string" ||
            out[to] === null)
        )
          out[to] = out[from];
      }
    }
    return out;
  };
  return visit(value) as T;
}

/** The text for a locale, falling back to the other language when that side is empty. */
export function pickText(
  en: string | null | undefined,
  ar: string | null | undefined,
  locale: string,
): string {
  const [first, second] = locale === "ar" ? [ar, en] : [en, ar];
  return first?.trim() ? first : (second ?? "");
}
