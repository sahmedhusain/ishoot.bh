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

test("YouTube owner refresh bundles are complete when active and tokens stay bounded", async () => {
  vi.stubEnv("ENCRYPTION_KEY", "01234567890123456789012345678901");
  try {
    const base = { channelId: "UC1234567890123456789012", apiKey: "test-key" };
    await expect(saveIntegrationSettings("youtube", { isActive: true, values: { ...base, clientId: "client" } }, "actor")).rejects.toThrow(/client ID, client secret and refresh token/);
    expect(storage.upsert).not.toHaveBeenCalled();
    await saveIntegrationSettings("youtube", { isActive: false, values: { clientId: "client" } }, "actor");
    await saveIntegrationSettings("youtube", { isActive: true, values: { ...base, ownerAccessToken: "a".repeat(4096) } }, "actor");
    expect(storage.upsert).toHaveBeenCalledTimes(2);
    expect(storage.upsert.mock.calls[1][0].create.credentials).not.toContain("a".repeat(4096));
    await expect(saveIntegrationSettings("youtube", { isActive: true, values: { ...base, ownerAccessToken: "a".repeat(4097) } }, "actor")).rejects.toThrow();
    expect(storage.upsert).toHaveBeenCalledTimes(2);
  } finally { vi.unstubAllEnvs(); }
});
