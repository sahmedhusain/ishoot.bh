import { describe, expect, test } from "vitest";
import {
  BUSINESS_ACTIVITIES,
  activityPreset,
} from "@platform/database/website-presets";
import {
  ACTIVITY_SAMPLES,
  SAMPLE_ARTICLE,
  SAMPLE_FAQS,
  sampleImage,
} from "@platform/database/samples/activity-samples";
import { exampleSnapshot } from "@platform/database/queries/samples";

const filled = (pair: readonly [string, string]) =>
  pair[0].trim().length > 0 && pair[1].trim().length > 0;

describe("sample content", () => {
  test("every activity has samples written in both languages", () => {
    for (const activity of BUSINESS_ACTIVITIES) {
      const sample = ACTIVITY_SAMPLES[activity];
      expect(sample, activity).toBeTruthy();
      expect(
        filled(sample.banner.title) && filled(sample.banner.subtitle),
        activity,
      ).toBe(true);
      expect(sample.items.length, activity).toBeGreaterThanOrEqual(3);
      for (const item of sample.items)
        expect(
          filled(item.title) && filled(item.subtitle),
          `${activity} ${item.title[0]}`,
        ).toBe(true);
      for (const service of sample.services)
        expect(
          filled(service.name) && filled(service.description),
          activity,
        ).toBe(true);
      for (const stat of sample.stats)
        expect(stat.value && filled(stat.label), activity).toBeTruthy();
    }
    for (const faq of SAMPLE_FAQS)
      expect(filled(faq.question) && filled(faq.answer)).toBe(true);
    expect(filled(SAMPLE_ARTICLE.title) && filled(SAMPLE_ARTICLE.body)).toBe(
      true,
    );
  });

  test("sample images are served by the website itself", () => {
    expect(sampleImage("banner", 0)).toBe("/api/samples/banner-1.svg");
    expect(sampleImage("item", 7)).toMatch(/^\/api\/samples\/item-[1-6]\.svg$/);
  });

  test("an example website is complete for every activity and only shows prices where the catalogue has them", () => {
    for (const activity of BUSINESS_ACTIVITIES) {
      const snapshot = exampleSnapshot(activity);
      expect(snapshot.config.purpose, activity).toBe(activity);
      expect(snapshot.banners).toHaveLength(1);
      expect(snapshot.portfolio.length).toBe(
        ACTIVITY_SAMPLES[activity].items.length,
      );
      expect(
        snapshot.pages.some((page) => page.page_type === "home"),
        activity,
      ).toBe(true);
      expect(snapshot.articles).toHaveLength(1);
      const prices =
        activityPreset(activity).collection.fields.includes("price");
      if (!prices)
        expect(
          snapshot.portfolio.every((item) => item.price === undefined),
          activity,
        ).toBe(true);
    }
  });
});
