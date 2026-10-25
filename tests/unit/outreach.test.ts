import { describe, expect, test } from "vitest";
import { getTranslations } from "../../packages/locales/src";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, COVERAGE_SENTIMENTS, LEGAL_KINDS, LEGAL_STATUSES, campaignReturn, isUtmSlug, matchesSegment, trackedLink, utmSlug } from "../../packages/database/src/constants/outreach";
import { ALL_RESOURCES, RESOURCE_FEATURES } from "../../packages/database/src/constants/permissions";

describe("marketing, PR and legal", () => {
  test("campaign names become tracking names, and links carry them", () => {
    expect(utmSlug("Eid Sale 2026!")).toBe("eid-sale-2026");
    expect(utmSlug("تخفيضات")).toBe("campaign");
    expect(isUtmSlug("eid-sale-2026")).toBe(true);
    expect(isUtmSlug("Eid Sale")).toBe(false);
    expect(trackedLink("https://shop.example.test/en/works?ref=1", { campaign: "eid", source: "instagram", medium: "social" })).toBe("https://shop.example.test/en/works?ref=1&utm_campaign=eid&utm_source=instagram&utm_medium=social");
  });

  test("segments match customers by orders, spend, recency and city", () => {
    const now = new Date("2026-06-30T00:00:00Z");
    const regular = { orders: 4, spent: 120, lastOrderAt: new Date("2026-06-20T00:00:00Z"), cities: ["Manama"] };
    const lapsed = { orders: 1, spent: 15, lastOrderAt: new Date("2026-01-01T00:00:00Z"), cities: ["Riffa"] };
    expect(matchesSegment({ minOrders: 3, minSpent: 100 }, regular, now)).toBe(true);
    expect(matchesSegment({ minOrders: 3 }, lapsed, now)).toBe(false);
    expect(matchesSegment({ orderedWithinDays: 30 }, regular, now)).toBe(true);
    expect(matchesSegment({ notOrderedForDays: 90 }, lapsed, now)).toBe(true);
    expect(matchesSegment({ notOrderedForDays: 90 }, { ...lapsed, lastOrderAt: null, orders: 0 }, now)).toBe(true);
    expect(matchesSegment({ city: "manama" }, regular, now)).toBe(true);
    expect(matchesSegment({ city: "manama" }, lapsed, now)).toBe(false);
  });

  test("return on spend is revenue per unit spent", () => {
    expect(campaignReturn(500, 200)).toBe(2.5);
    expect(campaignReturn(500, 0)).toBeNull();
  });

  test("each new area is a module-gated resource, named in both languages", () => {
    for (const [resource, module] of [["marketing", "marketing"], ["press", "pr"], ["legal", "legal"]] as const) {
      expect(ALL_RESOURCES).toContain(resource);
      expect(RESOURCE_FEATURES[resource]).toBe(module);
    }
    for (const locale of ["en", "ar"] as const) {
      const admin = getTranslations(locale).admin as unknown as { marketing: { campaigns: { channels: Record<string, string>; statuses: Record<string, string> } }; press: { sentiments: Record<string, string> }; legal: { kinds: Record<string, string>; statuses: Record<string, string> } };
      for (const c of CAMPAIGN_CHANNELS) expect(admin.marketing.campaigns.channels[c]).toBeTruthy();
      for (const s of CAMPAIGN_STATUSES) expect(admin.marketing.campaigns.statuses[s]).toBeTruthy();
      for (const s of COVERAGE_SENTIMENTS) expect(admin.press.sentiments[s]).toBeTruthy();
      for (const k of LEGAL_KINDS) expect(admin.legal.kinds[k]).toBeTruthy();
      for (const s of LEGAL_STATUSES) expect(admin.legal.statuses[s]).toBeTruthy();
    }
  });
});
