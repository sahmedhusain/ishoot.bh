import { describe, expect, test } from "vitest";
import {
  adminActivityCopy,
  getAdminTranslations,
  getTranslations,
  getWebsiteTranslations,
} from "../../locales";
import adminActivities from "../../locales/admin-activities.json";
import { BUSINESS_ACTIVITIES } from "../../lib/database/website-presets";

const FILM_WORDS =
  /cinema|cinematic|film|shoot|production|studio|crew|\bgear\b|سينما|سينمائي|فيلم|أفلام|تصوير|إنتاج|الإنتاج|استوديو|طاقم|مونتاج/i;
// Keys that name the media activity or a video format, so they read like film on purpose.
const MEDIA_BY_NAME = [
  /^setupWizard\.company\.activities\.media\./,
  /^setupWizard\.brand\.styleNames\.cinematic$/,
  /^copy\.aspectScope$/,
];

const flat = (
  value: unknown,
  prefix = "",
  out: Record<string, unknown> = {},
) => {
  if (value && typeof value === "object" && !Array.isArray(value))
    for (const [key, child] of Object.entries(value))
      flat(child, prefix ? `${prefix}.${key}` : key, out);
  else out[prefix] = value;
  return out;
};

describe("admin wording per business activity", () => {
  test("website defaults come from the selected app-owned locale", () => {
    expect(getWebsiteTranslations("en").nav.articles).toBe("News");
    expect(getWebsiteTranslations("ar").nav.articles).toBe("الأخبار");
    expect(getWebsiteTranslations("ar").hero.startProject).toBe("تواصل معنا");
  });

  test("the base admin copy reads neutrally for any activity", () => {
    for (const locale of ["en", "ar"] as const) {
      const film = Object.entries(flat(getTranslations(locale).admin))
        .filter(
          ([key, value]) =>
            typeof value === "string" &&
            FILM_WORDS.test(value) &&
            !MEDIA_BY_NAME.some((pattern) => pattern.test(key)),
        )
        .map(([key]) => key);
      expect(film, locale).toEqual([]);
    }
  });

  test("activities other than media keep the neutral copy", () => {
    for (const activity of BUSINESS_ACTIVITIES.filter((a) => a !== "media")) {
      for (const locale of ["en", "ar"] as const)
        expect(getAdminTranslations(locale, activity)).toEqual(
          getTranslations(locale).admin,
        );
    }
    expect(getAdminTranslations("en", null)).toEqual(
      getTranslations("en").admin,
    );
  });

  test("the media wording overrides existing keys only, in both languages", () => {
    for (const activity of Object.keys(adminActivities)) {
      const en = flat(adminActivityCopy("en", activity));
      const ar = flat(adminActivityCopy("ar", activity));
      expect(Object.keys(en).sort(), activity).toEqual(Object.keys(ar).sort());
      const base = flat(getTranslations("en").admin);
      for (const key of Object.keys(en))
        expect(base, key).toHaveProperty([key]);
    }
    expect(getAdminTranslations("en", "media").nav.calendar).toBe(
      adminActivities.media.en.nav.calendar,
    );
    expect(getAdminTranslations("en", "media").nav.deals).toBe(
      getTranslations("en").admin.nav.deals,
    );
  });
});
