import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import {
  getCommonTranslations,
  getUiTranslations,
} from "@platform/locales/additional";

describe("app-local locale dictionaries", () => {
  it("keeps the complete shared copy and UI labels in each language file", () => {
    for (const { code } of LANGUAGES) {
      const translations = getTranslations(code);
      const common = getCommonTranslations(code);
      const ui = getUiTranslations(code);

      expect(translations.shared.common).toEqual(common);
      expect(translations.shared.ui).toEqual(ui);
      expect(Object.values(common).every((value) => typeof value === "string" && value.trim())).toBe(true);
      expect(Object.values(ui).every((value) => typeof value === "string" && value.trim())).toBe(true);
    }
  });

  it("preserves website-specific copy alongside shared interface labels", () => {
    const english = getTranslations("en");
    const arabic = getTranslations("ar");

    expect(english.common.brandName).toBe("Company");
    expect(arabic.common.brandName).toBeTruthy();
    expect(english.shared.common).not.toEqual(english.common);
    expect(Object.keys(arabic.common).sort()).toEqual(Object.keys(english.common).sort());
  });

  it("keeps admin navigation and server errors out of the public website copy", () => {
    const english = getTranslations("en");

    expect(english.nav).not.toHaveProperty("adminPortal");
    expect(english.nav).not.toHaveProperty("webSettings");
    expect(serverMessages).not.toHaveProperty(
      "cannotSuspendTheLastActiveSuperAdmin",
    );
    expect(serverMessages).toHaveProperty(
      "websiteSetupIsIncompleteSaveAndPublish",
    );
  });

  it("accepts regional language tags and falls back safely for unknown languages", () => {
    expect(getUiTranslations("en-US")).toBe(getUiTranslations("en"));
    expect(getUiTranslations("ar-BH")).toBe(getUiTranslations("ar"));
    expect(getUiTranslations("FR_fr")).toBe(getUiTranslations("en"));
    expect(getUiTranslations("unknown")).toBe(getUiTranslations("en"));
  });
});
