import { test, expect } from "@playwright/test";

test.describe("CRM & Contacts Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"], input[name="email"]').fill("director@example.com");
    await page.locator('input[type="password"], input[name="password"]').fill("password");
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
  });

  test("can view customer contacts directory", async ({ page }) => {
    await page.goto("/dashboard/crm/customers");
    await page.waitForLoadState("networkidle");
    const heading = page.locator("h1, h2, [data-page-section]").first();
    await expect(heading).toBeVisible();
  });

  test("can navigate to deals pipeline view", async ({ page }) => {
    await page.goto("/dashboard/crm/deals");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
