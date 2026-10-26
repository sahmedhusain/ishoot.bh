import { beforeEach, expect, test, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import en from "../../packages/locales/src/admin/en.json";
import ar from "../../packages/locales/src/admin/ar.json";
import { INTEGRATION_PROVIDERS, integrationSetupLinks } from "../../packages/database/src/constants/integrations";

const storage = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn() }));
vi.mock("../../packages/database/src/db", () => ({ db: { integrationSetting: storage }, runAtomicMutation: vi.fn() }));
import { saveIntegrationSettings } from "../../packages/database/src/queries/integrations";
beforeEach(() => { vi.resetAllMocks(); storage.findUnique.mockResolvedValue(null); });

test("every kept provider has both setup guides and useful field formats", () => {
  const documentation = readFileSync("docs/INTEGRATIONS.md", "utf8");
  for (const locale of [en, ar]) for (const provider of INTEGRATION_PROVIDERS) {
    const guide = locale.integrations.providers[provider.id].guide;
    for (const value of Object.values(guide)) {
      expect(value.length).toBeGreaterThan(0);
      for (const paragraph of typeof value === "string" ? [value] : value) expect(documentation).toContain(paragraph);
    }
    expect(guide.steps.length).toBeGreaterThanOrEqual(3);
    for (const field of provider.fields) expect(locale.integrations.placeholders[field.key as keyof typeof locale.integrations.placeholders]).toBeTruthy();
  }
});

test("setup addresses use real routes and sanitized origins only", () => {
  for (const provider of INTEGRATION_PROVIDERS) {
    const links = integrationSetupLinks(provider.id, "https://shop.example.test/ignored?x=1", "https://admin.example.test/ignored");
    if (["social", "messaging", "couriers"].includes(provider.kind)) expect(links).toEqual([]);
    for (const link of links) {
      const url = new URL(link.url);
      expect(url.search).toBe("");
      expect(url.origin).toBe(provider.id === "resend" ? "https://admin.example.test" : "https://shop.example.test");
      const route = link.kind === "callback" ? "apps/web/app/api/account/[action]/callback/route.ts" : provider.id === "resend" ? "apps/admin/app/api/webhooks/resend/route.ts" : link.kind === "webhook" ? "apps/web/app/api/store/payment/webhook/[gateway]/route.ts" : "apps/web/app/api/store/payment/return/route.ts";
      expect(existsSync(route)).toBe(true);
    }
    for (const invalid of ["", "javascript:alert(1)", "https://secret:password@example.test"]) expect(integrationSetupLinks(provider.id, invalid, invalid)).toEqual([]);
  }
});

test.each([
  ["paypal", { environment: "lve" }],
  ["paytabs", { region: "typo" }],
  ["checkout_com", { apiPrefix: "evil.example/" }],
  ["google_signin", { clientId: "invalid", clientSecret: "test-secret" }],
])("invalid %s configuration is rejected at the server before persistence", async (provider, values) => {
  await expect(saveIntegrationSettings(provider, { isActive: provider === "google_signin", values }, "actor")).rejects.toThrow();
  expect(storage.upsert).not.toHaveBeenCalled();
});
