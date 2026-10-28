import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../../packages/locales/src/registry";
import { getAdminTranslations, getTranslations } from "../../packages/locales/src";
import { additionalTranslations, getCommonTranslations, getUiTranslations } from "../../packages/locales/src/additional";
import { commonAr, commonEn, withCommonCopy, type CommonTranslations } from "../../packages/locales/src/common.cjs";
import bindings from "../../packages/locales/src/common-bindings.json";
import rawAdmin from "../../packages/locales/src/admin/en.json";
import uiEnglish from "../../packages/locales/src/ui/en";

type Bindings = { [key: string]: string | Bindings };
function expectBindings(dictionary: unknown, map: Bindings, common: CommonTranslations) {
  const values = dictionary as Record<string, unknown>;
  for (const [key, reference] of Object.entries(map)) {
    if (typeof reference === "string") expect(values[key]).toBe(common[reference as keyof CommonTranslations]);
    else expectBindings(values[key], reference, common);
  }
}

describe("Shared interface wording", () => {
  it("preserves every existing lookup while keeping one canonical generic label", () => {
    expect(Object.keys(commonAr).sort()).toEqual(Object.keys(commonEn).sort());
    for (const { code } of LANGUAGES) {
      const common = getCommonTranslations(code);
      expectBindings(getTranslations(code), bindings.web, common);
      expectBindings(getAdminTranslations(code), bindings.admin, common);
      expectBindings(getUiTranslations(code), bindings.ui, common);
    }
  });

  it("preserves contextual copy and does not mutate dictionary source data", () => {
    const original = JSON.stringify(rawAdmin);
    const dictionary = withCommonCopy(rawAdmin, "admin", { ...commonEn, cancel: "Dismiss" });
    expect(dictionary.quotationForm.cancel).toBe("Dismiss");
    expect(dictionary.invoiceEdit.save).toBe("Save Invoice Changes");
    expect(JSON.stringify(rawAdmin)).toBe(original);
    expect(rawAdmin.actions).not.toHaveProperty("cancel");
  });

  it("covers every registered UI locale with complete resolved keys", () => {
    expect(Object.keys(additionalTranslations).sort()).toEqual(LANGUAGES.map(({ code }) => code).filter(code => code !== "en" && code !== "ar").sort());
    for (const { code } of LANGUAGES) {
      const copy = getUiTranslations(code);
      expect(Object.keys(copy).sort()).toEqual(Object.keys(uiEnglish).sort());
      expect(Object.values(copy).every(value => typeof value === "string" && value.trim())).toBe(true);
      expect(copy.countryCode).toBeTruthy();
      expect(copy.invalidPhone).toBeTruthy();
      expect(getUiTranslations(code)).toBe(copy);
    }
    expect(getUiTranslations("fr").cancel).toBe("Annuler");
    expect(getUiTranslations("kk").countryCode).toBe("Ел коды");
    expect(getUiTranslations("ta").selectOption).toBe("ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்");
  });

  it("accepts regional language tags and falls back safely for unknown languages", () => {
    expect(getUiTranslations("FR_fr")).toBe(getUiTranslations("fr"));
    expect(getUiTranslations("ar-BH")).toBe(getUiTranslations("ar"));
    expect(getUiTranslations("zh-TW")).toBe(getUiTranslations("zh-tw"));
    expect(getUiTranslations("unknown")).toBe(getUiTranslations("en"));
  });
});
