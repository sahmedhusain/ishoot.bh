import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin-audit";

test.describe("CRM & Contacts Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("can view customer contacts directory", async ({ page }) => {
    await page.goto("/dashboard/crm/contacts", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate to deals pipeline view", async ({ page }) => {
    await page.goto("/dashboard/crm/deals", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
  });
});
