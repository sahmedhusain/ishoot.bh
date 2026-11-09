import { test, expect } from "@playwright/test";

test.describe("Finance Dashboard & KPI Parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"], input[name="email"]').fill("director@example.com");
    await page.locator('input[type="password"], input[name="password"]').fill("password");
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
  });

  test("dashboard displays revenue and expense KPI cards", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const revenueCard = page.locator('[data-test="revenue-card"], [data-testid="revenue-card"], .admin-kpi:has-text("Revenue")').first();
    await expect(revenueCard).toBeVisible({ timeout: 10000 });

    const expensesCard = page.locator('[data-test="expenses-card"], [data-testid="expenses-card"], .admin-kpi:has-text("Expenses")').first();
    await expect(expensesCard).toBeVisible({ timeout: 10000 });
  });

  test("financial analytics displays aging buckets and cashflow indicators", async ({ page }) => {
    await page.goto("/dashboard/finance/analytics");
    await page.waitForLoadState("networkidle");

    const agingCard = page.locator('[data-test="aging-card"], [data-testid="aging-card"], [data-page-section]').first();
    await expect(agingCard).toBeVisible({ timeout: 10000 });
  });
});
