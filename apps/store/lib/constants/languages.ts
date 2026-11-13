
export type ContentLanguage = "ar" | "en";
export const CONTENT_LANGUAGES: readonly ContentLanguage[] = ["ar", "en"];

export function isContentLanguage(value: unknown): value is ContentLanguage {
  return value === "ar" || value === "en";
}

export function normalizeLanguages(value: unknown): ContentLanguage[] {
  const list = Array.isArray(value) ? value.filter(isContentLanguage) : [];
  const unique = CONTENT_LANGUAGES.filter((language) =>
    list.includes(language),
  );
  return unique.length ? unique : [...CONTENT_LANGUAGES];
}

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

export function pickText(
  en: string | null | undefined,
  ar: string | null | undefined,
  locale: string,
): string {
  const [first, second] = locale === "ar" ? [ar, en] : [en, ar];
  return first?.trim() ? first : (second ?? "");
}
