import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin-audit";

test.describe("Inventory & IT Operations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("can access stock inventory movements", async ({ page }) => {
    await page.goto("/dashboard/inventory/movements", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("can access IT support portal", async ({ page }) => {
    await page.goto("/dashboard/it-support", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
  });
});
