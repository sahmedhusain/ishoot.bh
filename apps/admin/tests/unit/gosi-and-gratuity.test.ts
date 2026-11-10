import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRATUITY_RULES,
  parseGratuityRules,
  validateGratuityRules,
} from "../../lib/hr/final-settlement";

describe("Admin HR Gratuity & Settlement Suite", () => {
  it("parses gratuity rules with default fallbacks", () => {
    const rules = parseGratuityRules({});
    expect(rules.enabled).toBe(false);
    expect(rules.wageBasis).toBe("basic");
    expect(rules.firstYears).toBe(DEFAULT_GRATUITY_RULES.firstYears);
    expect(rules.firstYearsMonths).toBe(DEFAULT_GRATUITY_RULES.firstYearsMonths);
    expect(rules.laterYearsMonths).toBe(DEFAULT_GRATUITY_RULES.laterYearsMonths);
  });

  it("parses custom gratuity parameters cleanly", () => {
    const rules = parseGratuityRules({
      enabled: true,
      appliesTo: ["expat"],
      wageBasis: "fixed",
      firstYears: 5,
      firstYearsMonths: 0.5,
      laterYearsMonths: 1,
      minServiceMonths: 12,
      serviceUntil: "2026-12-31",
    });

    expect(rules.enabled).toBe(true);
    expect(rules.appliesTo).toEqual(["expat"]);
    expect(rules.wageBasis).toBe("fixed");
    expect(rules.firstYears).toBe(5);
    expect(rules.serviceUntil).toBe("2026-12-31");
  });

  it("validates gratuity rules boundaries", () => {
    const valid = validateGratuityRules({
      enabled: true,
      appliesTo: ["expat"],
      wageBasis: "basic",
      firstYears: 3,
      firstYearsMonths: 0.5,
      laterYearsMonths: 1,
      minServiceMonths: 0,
      serviceUntil: null,
    });
    expect(valid.enabled).toBe(true);
  });
});
