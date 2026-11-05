import { describe, expect, test } from "vitest";
import {
  getTranslations,
  LANGUAGES,
  serverMessages,
} from "../../locales";
import {
  getCommonTranslations,
  getUiTranslations,
} from "../../locales/additional";

describe("IT app-local dictionaries", () => {
  test("shared labels and controls resolve from the app's complete locale files", () => {
    for (const { code } of LANGUAGES) {
      const translations = getTranslations(code);
      expect(translations.shared.common).toEqual(getCommonTranslations(code));
      expect(translations.shared.ui).toEqual(getUiTranslations(code));
      expect(Object.values(translations.shared.common).every(Boolean)).toBe(true);
      expect(Object.values(translations.shared.ui).every(Boolean)).toBe(true);
    }
  });

  test("Arabic and English UI labels remain app-local and regional tags resolve", () => {
    expect(getUiTranslations("en").cancel).toBe("Cancel");
    expect(getUiTranslations("ar").cancel).toBe("إلغاء");
    expect(getUiTranslations("ar-BH")).toBe(getUiTranslations("ar"));
  });

  test("the IT error catalog contains IT messages, not admin-only messages", () => {
    expect(serverMessages.providerInvalidResponse).toBeTruthy();
    expect(serverMessages).not.toHaveProperty(
      "cannotSuspendTheLastActiveSuperAdmin",
    );
  });
});
