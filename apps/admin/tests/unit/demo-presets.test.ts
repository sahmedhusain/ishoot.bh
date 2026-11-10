import { describe, expect, test } from "vitest";
import { DEMO_PRESETS, demoPreset } from "../../lib/demo-presets";
import {
  BUSINESS_ACTIVITIES,
  type BusinessActivity,
} from "../../lib/website-presets";
import { STYLE_PRESETS } from "../../lib/constants/theme";

describe("demo presets", () => {
  test("lists all valid activity presets", () => {
    expect(DEMO_PRESETS).toEqual([...BUSINESS_ACTIVITIES, "all"]);
    for (const activity of BUSINESS_ACTIVITIES) {
      const demo = demoPreset(activity);
      expect(demo.id).toBe(activity);
      expect(demo.activity).toBe(activity);
      expect(demo.website.purpose).toBe(activity);
      expect(demo.modules.length).toBeGreaterThan(0);
    }
  });

  test("demoPreset('all') enables all website sections", () => {
    const demo = demoPreset("all");
    expect(demo.activity).toBe("media");
    expect(demo.website.sections.every((s) => s.visible)).toBe(true);
  });

  test("allows custom style override", () => {
    for (const style of STYLE_PRESETS) {
      const demo = demoPreset("products", style.id);
      expect(demo.style).toBe(style.id);
    }
  });

  test("validates unknown presets and styles", () => {
    expect(() => demoPreset("typo")).toThrow("Unknown demo preset");
    expect(() => demoPreset("all", "typo")).toThrow("Unknown demo style");
  });
});
