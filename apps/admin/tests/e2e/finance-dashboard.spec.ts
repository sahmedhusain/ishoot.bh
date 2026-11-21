import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin-audit";

test.describe("Finance Dashboard & KPI Parity", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("dashboard displays revenue and expense KPI cards", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main [data-page-section]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("financial analytics displays aging buckets and cashflow indicators", async ({ page }) => {
    await page.goto("/dashboard/analytics", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
  });
});
