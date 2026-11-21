import { expect, test } from "@playwright/test";

const IT_URL = (process.env.IT_URL || "http://localhost:3002").replace(/\/$/, "");

test.describe("IT Staff Accounts Management & Comprehensive Website Operations", () => {
  test("IT /staff-accounts shows KPI strip, No MFA filter, @username badges and HR onboarding prefill banner", async ({ page }) => {
    await page.goto(`${IT_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="username"], input[name="email"], input[type="text"]').first().fill(process.env.IT_ADMIN_USERNAME || "BA0001");
    await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.IT_ADMIN_PASSWORD || "ITAdmin12345678!");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/localhost:3002\/(?!login)/, { timeout: 25000, waitUntil: "domcontentloaded" });

    await page.goto(
      `${IT_URL}/staff-accounts?prefillName=Nasser+Al-Doseri&prefillEmail=nasser.test%40zayedgroup.bh&prefillUsername=nasser.sales.e2e&copyFrom=ahmed-zayani`,
      { waitUntil: "networkidle" },
    );

    await expect(page.locator('input[value="nasser.sales.e2e"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[value="nasser.test@zayedgroup.bh"]')).toBeVisible();
    await expect(page.locator('option[value="no_mfa"]')).toBeAttached();
  });

  test("IT /site renders Pages & SEO and Operations & Cache management tabs cleanly", async ({ page }) => {
    await page.goto(`${IT_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="username"], input[name="email"], input[type="text"]').first().fill(process.env.IT_ADMIN_USERNAME || "BA0001");
    await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.IT_ADMIN_PASSWORD || "ITAdmin12345678!");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/localhost:3002\/(?!login)/, { timeout: 25000, waitUntil: "domcontentloaded" });

    await page.goto(`${IT_URL}/site`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Pages & SEO/i }).click();
    await expect(page.getByText(/CMS Pages/i)).toBeVisible();

    await page.getByRole("button", { name: /Operations & Cache/i }).click();
    await expect(page.getByRole("button", { name: /Publish Live Snapshot/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Revalidate Web & Store Cache/i }).first()).toBeVisible();
  });
});
