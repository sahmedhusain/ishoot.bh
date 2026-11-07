import { test, expect } from "@playwright/test";

test.describe("Inventory & IT Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"], input[name="email"]').fill("director@example.com");
    await page.locator('input[type="password"], input[name="password"]').fill("password");
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
  });

  test("can access stock inventory movements", async ({ page }) => {
    await page.goto("/dashboard/inventory/movements");
    await page.waitForLoadState("networkidle");
    const container = page.locator("main, [data-page-section], table, ul").first();
    await expect(container).toBeVisible();
  });

  test("can access IT support portal", async ({ page }) => {
    await page.goto("/dashboard/support");
    await page.waitForLoadState("networkidle");
    const container = page.locator("main, [data-page-section]").first();
    await expect(container).toBeVisible();
  });
});
