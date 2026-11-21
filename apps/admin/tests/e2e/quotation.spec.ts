import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin-audit";

test.describe("Quotations Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("can view quotations list", async ({ page }) => {
    await page.goto("/dashboard/quotations", { waitUntil: "domcontentloaded" });
    const container = page.locator("main h1").first();
    await expect(container).toBeVisible({ timeout: 10_000 });
  });
});
