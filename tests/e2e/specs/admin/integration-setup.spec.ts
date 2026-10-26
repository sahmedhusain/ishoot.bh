import { expect, test } from "@playwright/test";
import { generateKeyPairSync } from "node:crypto";
import en from "../../../../packages/locales/src/admin/en.json";
import ar from "../../../../packages/locales/src/admin/ar.json";
import { INTEGRATION_PROVIDERS } from "../../../../packages/database/src/constants/integrations";
import { testDatabase } from "../../helpers";

const db = testDatabase();
test.beforeEach(async () => {
  await db.integrationSetting.deleteMany({
    where: { provider: { in: ["youtube", "apple_signin"] } },
  });
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`integration guides, field feedback and discard guard (${locale}, ${theme})`, async ({
      page,
    }) => {
      const copy = (locale === "en" ? en : ar).integrations;
      await page.setViewportSize({
        width: locale === "ar" ? 390 : 1440,
        height: 900,
      });
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem("platform_admin_locale", locale);
          localStorage.setItem("platform_admin_theme", theme);
          Object.defineProperty(navigator, "clipboard", {
            value: {
              writeText: async (value: string) => {
                (window as Window & { copiedAddress?: string }).copiedAddress =
                  value;
              },
            },
          });
        },
        { locale, theme },
      );
      await page.goto("/dashboard/settings/integrations");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      for (const provider of INTEGRATION_PROVIDERS) {
        const card = page.getByTestId(`integration-${provider.id}`);
        await card.locator("summary").click();
        await expect(card).toContainText(
          copy.providers[provider.id].guide.verify,
        );
        if (["social", "messaging", "couriers"].includes(provider.kind))
          await expect(card).toContainText(copy.setup.noCallback);
      }
      const google = page.getByTestId("integration-google_signin");
      const callback = await google.locator("code").innerText();
      expect(new URL(callback).pathname).toBe("/api/account/google/callback");
      await google
        .getByRole("button", {
          name: `${copy.setup.copy} ${copy.setup.callback}`,
          exact: true,
        })
        .click();
      expect(
        await page.evaluate(
          () => (window as Window & { copiedAddress?: string }).copiedAddress,
        ),
      ).toBe(callback);

      const youtube = page.getByTestId("integration-youtube");
      await youtube
        .getByRole("button", { name: copy.configure, exact: true })
        .click();
      await youtube.getByRole("switch", { name: copy.enabled }).check();
      await youtube
        .getByLabel(copy.fields.channelId, { exact: false })
        .fill("UC-owned-test-channel");
      await youtube
        .getByRole("button", { name: copy.save, exact: true })
        .click();
      await expect(youtube.locator("#youtube-apiKey")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await youtube
        .getByRole("button", { name: copy.cancel, exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(copy.setup.discardBody);
      await page.keyboard.press("Escape");
      await expect(youtube.locator("#youtube-channelId")).toHaveValue(
        "UC-owned-test-channel",
      );
      await youtube
        .getByRole("button", { name: copy.cancel, exact: true })
        .click();
      await dialog.locator("button").last().click();
      await expect(youtube.locator("form")).toHaveCount(0);

      const apple = page.getByTestId("integration-apple_signin");
      await apple
        .getByRole("button", { name: copy.configure, exact: true })
        .click();
      await apple.locator('input[type="file"]').setInputFiles({
        name: "bad.p8",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("invalid"),
      });
      await expect(apple).toContainText(copy.setup.keyInvalid);
      const { privateKey } = generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
      });
      await apple.locator('input[type="file"]').setInputFiles({
        name: "test.p8",
        mimeType: "application/octet-stream",
        buffer: Buffer.from(
          privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
        ),
      });
      await expect(apple).toContainText(copy.setup.keyReady);
      await apple
        .getByRole("button", { name: copy.cancel, exact: true })
        .click();
      await dialog.locator("button").last().click();
      expect(
        await page
          .locator("main")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    });
  }
