import { describe, expect, test } from "vitest";
import { getTranslations } from "../../packages/locales/src";
import { MAX_OPTIONS, PRODUCT_UNITS, SKU_PATTERN, normalizeProductOptions, variantCombinations, variantLabel, variantSku } from "../../packages/database/src/constants/products";
import { DEFAULT_FEATURE_MODULES, moduleOnByDefault } from "../../packages/database/src/constants/features";
import { ACTIVITY_PRESETS } from "../../packages/database/src/website-presets";

describe("products", () => {
  test("options are cleaned: names and values trimmed, one language fills the other, repeats dropped", () => {
    const options = normalizeProductOptions([
      { nameEn: " Size ", nameAr: "", values: [{ en: "S", ar: "صغير" }, { en: " s ", ar: "" }, { en: "M", ar: "" }, { en: "", ar: "" }] },
      { nameEn: "Empty", nameAr: "فارغ", values: [] },
    ]);
    expect(options).toEqual([{ nameEn: "Size", nameAr: "Size", values: [{ en: "S", ar: "صغير" }, { en: "M", ar: "M" }] }]);
  });

  test("too many options or values are refused", () => {
    const option = (n: number) => ({ nameEn: `O${n}`, nameAr: `O${n}`, values: [{ en: "a", ar: "a" }] });
    expect(normalizeProductOptions(Array.from({ length: MAX_OPTIONS + 1 }, (_, i) => option(i)))).toBeNull();
    expect(normalizeProductOptions([{ nameEn: "Many", nameAr: "Many", values: Array.from({ length: 21 }, (_, i) => ({ en: `v${i}`, ar: `v${i}` })) }])).toBeNull();
  });

  test("every combination of option values becomes a variant, labelled in the reader's language", () => {
    const options = normalizeProductOptions([
      { nameEn: "Size", nameAr: "المقاس", values: [{ en: "S", ar: "صغير" }, { en: "M", ar: "متوسط" }] },
      { nameEn: "Colour", nameAr: "اللون", values: [{ en: "Red", ar: "أحمر" }, { en: "Blue", ar: "أزرق" }] },
    ])!;
    expect(variantCombinations(options)).toEqual([["S", "Red"], ["S", "Blue"], ["M", "Red"], ["M", "Blue"]]);
    expect(variantCombinations([])).toEqual([]);
    expect(variantLabel(options, ["M", "Blue"], "ar")).toBe("متوسط / أزرق");
    expect(variantLabel(options, ["M", "Blue"], "en")).toBe("M / Blue");
  });

  test("suggested variant SKUs are valid SKUs", () => {
    expect(variantSku("TEE-001", ["M", "Navy blue"])).toBe("TEE-001-M-NAVYBL");
    expect(SKU_PATTERN.test(variantSku("TEE-001", ["أحمر"]))).toBe(true);
    expect(SKU_PATTERN.test("-bad")).toBe(false);
  });

  test("units have names in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const units = getTranslations(locale).admin.products.editor.units as Record<string, string>;
      for (const unit of PRODUCT_UNITS) expect(units[unit], `${locale} ${unit}`).toBeTruthy();
    }
  });

  test("the products module starts off, and activities that sell goods switch it on", () => {
    expect(DEFAULT_FEATURE_MODULES.some((m) => m.moduleKey === "products")).toBe(true);
    expect(moduleOnByDefault("products")).toBe(false);
    expect(moduleOnByDefault("cms")).toBe(true);
    expect(moduleOnByDefault("something_new")).toBe(true);
    expect(ACTIVITY_PRESETS.online_store.modules.products).toBe(true);
    expect(ACTIVITY_PRESETS.media.modules.products).toBeUndefined();
  });
});
