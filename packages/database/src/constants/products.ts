// Products: units, options and variants. Runtime-free, so the admin's forms use the same rules as the server.

export const PRODUCT_UNITS = ["piece", "box", "pack", "kg", "g", "l", "ml", "m", "hour", "service"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];
export const isProductUnit = (value: unknown): value is ProductUnit =>
  typeof value === "string" && (PRODUCT_UNITS as readonly string[]).includes(value);

/** A product has at most this many options (size, colour, material), each with at most MAX_OPTION_VALUES values. */
export const MAX_OPTIONS = 3;
export const MAX_OPTION_VALUES = 20;
/** Every combination becomes a variant, so their number is capped. */
export const MAX_VARIANTS = 100;

export interface ProductOptionValue {
  en: string;
  ar: string;
}
export interface ProductOption {
  nameEn: string;
  nameAr: string;
  values: ProductOptionValue[];
}

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Options as stored: names and values trimmed, a missing language filled from the other, empty values and
 * repeated values dropped, and options without a name or values removed. Returns null when there are too many.
 */
export function normalizeProductOptions(input: unknown): ProductOption[] | null {
  if (!Array.isArray(input)) return [];
  const options: ProductOption[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const nameEn = clean(item.nameEn, 40) || clean(item.nameAr, 40);
    const nameAr = clean(item.nameAr, 40) || nameEn;
    const seen = new Set<string>();
    const values: ProductOptionValue[] = [];
    for (const v of Array.isArray(item.values) ? item.values : []) {
      const value = v as Record<string, unknown> | null;
      const en = clean(value?.en, 40) || clean(value?.ar, 40);
      const ar = clean(value?.ar, 40) || en;
      if (!en || seen.has(en.toLowerCase())) continue;
      seen.add(en.toLowerCase());
      values.push({ en, ar });
    }
    if (!nameEn || !values.length) continue;
    if (values.length > MAX_OPTION_VALUES) return null;
    options.push({ nameEn, nameAr, values });
  }
  if (options.length > MAX_OPTIONS) return null;
  return options;
}

/** Every combination of the options' values, in order: [["S","Red"], ["S","Blue"], ["M","Red"], …]. */
export function variantCombinations(options: ProductOption[]): string[][] {
  return options.reduce<string[][]>((combos, option) => combos.flatMap((combo) => option.values.map((value) => [...combo, value.en])), options.length ? [[]] : []);
}

/** "M / Red" in the reader's language, from the English values stored on the variant. */
export function variantLabel(options: ProductOption[], values: string[], locale: string) {
  return values
    .map((value, index) => {
      const match = options[index]?.values.find((v) => v.en === value);
      return match ? (locale === "ar" ? match.ar : match.en) : value;
    })
    .join(" / ");
}

/** A suggested variant SKU: the product's SKU and the start of each value, e.g. TEE-001-M-RED. */
export function variantSku(productSku: string, values: string[]) {
  const parts = values.map((value) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6) || "X");
  return [productSku, ...parts].join("-").slice(0, 60);
}

export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,59}$/;
