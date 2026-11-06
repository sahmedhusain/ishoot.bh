import { beforeEach, expect, test, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  INTEGRATION_PROVIDERS,
  integrationSetupLinks,
} from "@platform/database/constants/integrations";

const apiClient = vi.hoisted(() => ({
  getIntegration: vi.fn(),
  setIntegration: vi.fn(),
}));
vi.mock("@platform/api-client", () => ({
  getIntegration: apiClient.getIntegration,
  setIntegration: apiClient.setIntegration,
}));
import { saveIntegrationSettings } from "@platform/database/queries/integrations";
beforeEach(() => {
  vi.resetAllMocks();
  apiClient.getIntegration.mockResolvedValue(null);
  apiClient.setIntegration.mockResolvedValue(undefined);
});

test("every kept provider has both setup guides and useful field formats", () => {
  const localeDir = path.resolve(__dirname, "../../locales");
  const locales = ["en", "ar"].map((locale) => {
    const json = JSON.parse(
      readFileSync(path.join(localeDir, `${locale}.json`), "utf8"),
    );
    return json.admin ?? json;
  });
  const documentation = readFileSync(
    path.resolve(__dirname, "../../../../docs/INTEGRATIONS.md"),
    "utf8",
  );
  for (const locale of locales)
    for (const provider of INTEGRATION_PROVIDERS) {
      const guide = locale.integrations.providers[provider.id].guide;
      for (const value of Object.values(guide)) {
        expect(value.length).toBeGreaterThan(0);
        for (const paragraph of typeof value === "string" ? [value] : value)
          expect(documentation).toContain(paragraph);
      }
      expect(guide.steps.length).toBeGreaterThanOrEqual(3);
      for (const field of provider.fields)
        expect(
          locale.integrations.fields[
            field.key as keyof typeof locale.integrations.fields
          ],
        ).toBeTruthy();
    }
});

test("setup addresses use real routes and sanitized origins only", () => {
  for (const provider of INTEGRATION_PROVIDERS) {
    const links = integrationSetupLinks(
      provider.id,
      "https://shop.example.test/ignored?x=1",
      "https://admin.example.test/ignored",
    );
    if (["social", "messaging", "couriers"].includes(provider.kind))
      expect(links).toEqual([]);
    for (const link of links) {
      const url = new URL(link.url);
      expect(url.search).toBe("");
      expect(url.origin).toBe(
        provider.id === "resend"
          ? "https://admin.example.test"
          : "https://shop.example.test",
      );
      const route =
        link.kind === "callback"
          ? "apps/web/app/api/account/[action]/callback/route.ts"
          : provider.id === "resend"
            ? "apps/admin/app/api/webhooks/resend/route.ts"
            : link.kind === "webhook"
              ? "apps/web/app/api/store/payment/webhook/[gateway]/route.ts"
              : "apps/web/app/api/store/payment/return/route.ts";
      expect(existsSync(path.resolve(__dirname, "../../../../", route))).toBe(true);
    }
    for (const invalid of [
      "",
      "javascript:alert(1)",
      "https://secret:password@example.test",
    ])
      expect(integrationSetupLinks(provider.id, invalid, invalid)).toEqual([]);
  }
});

test.each([
  ["paypal", { environment: "lve" }],
  ["paytabs", { region: "typo" }],
  ["checkout_com", { apiPrefix: "evil.example/" }],
  ["google_signin", { clientId: "invalid", clientSecret: "test-secret" }],
])(
  "invalid %s configuration is rejected at the server before persistence",
  async (provider, values) => {
    await expect(
      saveIntegrationSettings(
        provider,
        { isActive: provider === "google_signin", values },
        "actor",
      ),
    ).rejects.toThrow();
    expect(apiClient.setIntegration).not.toHaveBeenCalled();
  },
);

test("YouTube owner refresh bundles are complete when active and tokens stay bounded", async () => {
  try {
    const base = { channelId: "UC1234567890123456789012", apiKey: "test-key" };
    await expect(
      saveIntegrationSettings(
        "youtube",
        { isActive: true, values: { ...base, clientId: "client" } },
        "actor",
      ),
    ).rejects.toThrow(/client ID, client secret and refresh token/);
    expect(apiClient.setIntegration).not.toHaveBeenCalled();
    await saveIntegrationSettings(
      "youtube",
      { isActive: false, values: { clientId: "client" } },
      "actor",
    );
    await saveIntegrationSettings(
      "youtube",
      {
        isActive: true,
        values: { ...base, ownerAccessToken: "a".repeat(4096) },
      },
      "actor",
    );
    expect(apiClient.setIntegration).toHaveBeenCalledTimes(2);
    expect(apiClient.setIntegration.mock.calls[1][1].values.ownerAccessToken).toBe(
      "a".repeat(4096),
    );
    await expect(
      saveIntegrationSettings(
        "youtube",
        {
          isActive: true,
          values: { ...base, ownerAccessToken: "a".repeat(4097) },
        },
        "actor",
      ),
    ).rejects.toThrow();
    expect(apiClient.setIntegration).toHaveBeenCalledTimes(2);
  } finally {
  }
});
