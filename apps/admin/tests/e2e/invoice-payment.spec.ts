import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin-audit";

test.describe("Invoices & Payments Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("can load and view invoices list", async ({ page }) => {
    await page.goto("/dashboard/invoices", { waitUntil: "domcontentloaded" });
    const container = page.locator("main h1").first();
    await expect(container).toBeVisible({ timeout: 10_000 });
  });

  test("can view payments ledger", async ({ page }) => {
    await page.goto("/dashboard/payments", { waitUntil: "domcontentloaded" });
    const container = page.locator("main h1").first();
    await expect(container).toBeVisible({ timeout: 10_000 });
  });
});
