import { describe, expect, it } from "vitest";
import { getCompanyBranding } from "../../lib/company-branding";

describe("IT Company Branding Suite", () => {
  it("returns default fallback branding when company is unconfigured", async () => {
    const branding = await getCompanyBranding();
    expect(branding).toBeDefined();
    expect(branding.name).toBe("Console");
    expect(branding.isSetup).toBe(false);
    expect(branding.iconUrl).toBeNull();
  });
});
