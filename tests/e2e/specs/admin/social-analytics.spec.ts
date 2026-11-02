import { expect, test } from "@playwright/test";
import en from "../../../../packages/locales/src/admin/en";
import ar from "../../../../packages/locales/src/admin/ar";
import { testDatabase } from "../../helpers";
import {
  setIntegration,
  unlinkIntegration,
  updateIntegrationStatus,
} from "../../integrations";

const db = testDatabase();
const externalId = "e2e-unattributed-social-post";
const legacyMetricId = "e2e-unattributed-social-metric";
const zeroMetricId = "e2e-verified-zero-social-metric";
const accountId = "e2e-provider-page";

test.beforeEach(async () => {
  for (const p of ["meta", "youtube", "tiktok", "x", "linkedin"]) {
    await setIntegration(p, false).catch(() => {});
  }
  await db.socialMetric.upsert({
    where: { id: legacyMetricId },
    create: {
      id: legacyMetricId,
      platform: "facebook",
      metricType: "followers",
      value: 999999,
      recordedAt: new Date(),
    },
    update: {},
  });
  await db.socialPost.upsert({
    where: { platform_externalId: { platform: "facebook", externalId } },
    create: {
      platform: "facebook",
      externalId,
      publishedAt: new Date(),
      likes: 999999,
    },
    update: {},
  });
});

test.afterEach(async () => {
  await db.socialPost.deleteMany({ where: { externalId } });
  await db.socialMetric.deleteMany({
    where: { id: { in: [legacyMetricId, zeroMetricId] } },
  });
  await unlinkIntegration("meta").catch(() => {});
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`disconnected analytics hides legacy figures and offers Connect (${locale}, ${theme})`, async ({
      page,
    }) => {
      const copy = (locale === "en" ? en : ar).socialAnalytics;
      await page.setViewportSize({
        width: locale === "ar" ? 390 : 1440,
        height: 900,
      });
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem("platform_admin_locale", locale);
          localStorage.setItem("platform_admin_theme", theme);
        },
        { locale, theme },
      );
      await page.goto("/dashboard/analytics");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(
        page.getByRole("main").getByTestId("social-empty"),
      ).toContainText(copy.empty);
      await expect(
        page
          .getByRole("main")
          .getByTestId("social-empty")
          .getByRole("link", { name: copy.connect }),
      ).toHaveAttribute("href", "/dashboard/it-support");
      await expect(page.getByTestId("social-account-facebook")).toContainText(
        copy.notConnected,
      );
      await expect(page.getByTestId("social-kpis")).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText("999,999");
      expect(
        await page
          .locator("main")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    });
  }

test("connected account without readings stays empty; verified zero is real data", async ({
  page,
}) => {
  await setIntegration(
    "meta",
    true,
    { pageId: "page-1", accessToken: "e2e-token" },
    {},
  );
  await page.goto("/dashboard/analytics?platform=facebook");
  await expect(
    page.getByRole("main").getByTestId("social-empty"),
  ).toContainText(ar.socialAnalytics.noData);
  await expect(page.getByTestId("social-kpis")).toHaveCount(0);
  await updateIntegrationStatus("meta", {
    config: {
      socialAccounts: { facebook: accountId },
      availableMetrics: { facebook: ["followers"] },
    },
    lastSyncedAt: new Date().toISOString(),
  });
  await db.socialMetric.create({
    data: {
      id: zeroMetricId,
      platform: "facebook",
      metricType: "followers",
      value: 0,
      sourceProvider: "meta",
      sourceAccountId: accountId,
    },
  });
  await page.reload();
  await expect(page.getByRole("main").getByTestId("social-empty")).toHaveCount(
    0,
  );
  await expect(page.getByTestId("social-kpis")).toBeVisible();
  await expect(page.getByTestId("social-account-facebook")).not.toContainText(
    ar.socialAnalytics.noData,
  );
  await expect(page.locator('[data-testid^="social-account-"]')).toHaveCount(1);
});
