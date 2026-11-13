import { selectOption } from "./helpers/select-option";
import { expect, test } from "@playwright/test";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
import { testDatabase } from "./helpers/helpers";
import {
  setIntegration,
  unlinkIntegration,
  updateIntegrationStatus,
} from "./helpers/integrations";
const en = enLocale.admin;
const ar = arLocale.admin;

const db = testDatabase();
const accountId = "e2e-owner-youtube";
const metricId = "e2e-owner-public-followers";
const recordedAt = new Date();
const end = new Date("2026-10-25T00:00:00Z");
const periods = [7, 30, 90, 365];
test.use({ timezoneId: "America/Los_Angeles" });

test.beforeEach(async () => {
  for (const p of ["meta", "youtube", "tiktok", "x", "linkedin"]) {
    await setIntegration(p, false).catch(() => {});
  }
  const config = {
    socialAccounts: { youtube: accountId },
    availableMetrics: { youtube: ["followers"] },
    ownerInsights: {
      youtube: {
        status: "ready",
        timeZone: "America/Los_Angeles",
        availablePeriods: periods,
      },
    },
  };
  await setIntegration("youtube", true, { channelId: accountId, apiKey: "e2e-owner-key" }, config);
  await updateIntegrationStatus("youtube", {
    lastSyncedAt: recordedAt.toISOString(),
  });
  await db.socialMetric.upsert({
    where: { id: metricId },
    create: {
      id: metricId,
      platform: "youtube",
      metricType: "followers",
      sourceProvider: "youtube",
      sourceAccountId: accountId,
      value: 0,
      recordedAt,
    },
    update: { recordedAt },
  });
  await db.socialInsightSnapshot.deleteMany({
    where: { sourceAccountId: accountId },
  });
  await db.socialInsightSnapshot.createMany({
    data: periods.map((periodDays) => ({
      platform: "youtube",
      sourceProvider: "youtube",
      sourceAccountId: accountId,
      periodDays,
      periodStart: new Date(end.getTime() - (periodDays - 1) * 86_400_000),
      periodEnd: end,
      timeZone: "America/Los_Angeles",
      metrics: {
        views: 12345 + periodDays,
        likes: 0,
        comments: 3,
        shares: 8,
        followers_gained: 7,
        followers_lost: 2,
      },
      nativeMetrics: { views: "views", likes: "likes" },
      recordedAt,
    })),
  });
});
test.afterEach(async () => {
  await db.socialInsightSnapshot.deleteMany({
    where: { sourceAccountId: accountId },
  });
  await db.socialMetric.deleteMany({ where: { id: metricId } });
  await unlinkIntegration("youtube").catch(() => {});
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`native owner ranges, genuine zero and unsupported metrics (${locale}, ${theme})`, async ({
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
      await page.goto("/dashboard/analytics?platform=youtube");
      const panel = page.getByRole("main").getByTestId("social-owner-youtube");
      await expect(panel).toContainText(copy.owner.scope);
      await expect(
        panel.getByTestId("owner-metric-likes").locator("dd"),
      ).toHaveText("0");
      for (const metric of ["reach", "impressions", "profile_views"]) {
        await expect(
          panel.getByTestId(`owner-metric-${metric}`).locator("dd"),
        ).toHaveText("—");
        await expect(panel.getByTestId(`owner-metric-${metric}`)).toContainText(
          copy.owner.unavailable,
        );
      }
      const formatter = new Intl.DateTimeFormat(
        locale === "ar" ? "ar-u-nu-latn" : "en-GB",
        { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" },
      );
      await expect(panel.getByTestId("owner-period")).toContainText(
        formatter.format(end),
      );
      await expect(panel.getByTestId("owner-period")).toContainText(
        copy.owner.pacific,
      );
      for (const days of periods) {
        await selectOption(page
          .getByRole("combobox", { name: copy.period, exact: true }), String(days));
        await expect(
          panel.getByTestId("owner-metric-views").locator("dd"),
        ).toHaveText(
          new Intl.NumberFormat(
            locale === "ar" ? "ar-u-nu-latn" : "en-GB",
          ).format(12345 + days),
        );
      }
      expect(
        await page
          .getByRole("main")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    });
  }

for (const locale of ["en", "ar"] as const) {
  test(`owner setup, permission, expiry, quota and disconnected states hide prior readings (${locale})`, async ({
    page,
  }) => {
    const copy = (locale === "en" ? en : ar).socialAnalytics;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    for (const status of [
      "auth_required",
      "no_data",
      "permission_required",
      "reconnect",
      "rate_limited",
      "error",
    ] as const) {
      await updateIntegrationStatus("youtube", {
        config: {
          socialAccounts: { youtube: accountId },
          ownerInsights: {
            youtube: {
              status,
              error: status === "rate_limited" ? "quotaExceeded" : null,
              retryAfterAt:
                status === "rate_limited"
                  ? new Date(Date.now() + 60_000).toISOString()
                  : null,
            },
          },
        },
      });
      await page.goto("/dashboard/analytics?platform=youtube");
      const panel = page.getByRole("main").getByTestId("social-owner-youtube");
      await expect(panel.getByRole("status")).toHaveText(
        copy.owner.statuses[status],
      );
      await expect(panel.locator("dd")).toHaveCount(0);
      await expect(
        panel.getByRole("link", { name: copy.owner.configure }),
      ).toHaveAttribute("href", "/dashboard/it-support");
      if (status === "rate_limited")
        await expect(panel).toContainText("quotaExceeded");
    }
    await setIntegration("youtube", false);
    await page.reload();
    await expect(page.getByRole("main").getByTestId("social-owner-youtube")).toHaveCount(0);
  });
}
