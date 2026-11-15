import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api/company", () => ({
  getCompanyConfiguration: vi.fn(async () => null),
  getCompanyConfigurationForIT: vi.fn(async () => null),
  getCompanySetupStatus: vi.fn(async () => ({ finished: false, complete: false })),
  getCompanySetupStatusForIT: vi.fn(async () => ({ finished: false, complete: false })),
}));

vi.mock("../../lib/session", () => ({
  asUser: vi.fn(async () => null),
  currentUser: vi.fn(async () => null),
}));

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
