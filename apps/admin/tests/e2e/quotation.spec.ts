import { test, expect } from "@playwright/test";

test.describe("Quotations Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"], input[name="email"]').fill("director@example.com");
    await page.locator('input[type="password"], input[name="password"]').fill("password");
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
  });

  test("can view quotations list", async ({ page }) => {
    await page.goto("/dashboard/quotations");
    await page.waitForLoadState("networkidle");
    const container = page.locator("main, [data-page-section], table, ul").first();
    await expect(container).toBeVisible();
  });
});
