import { test, expect } from "@playwright/test";

test.describe("Authentication Flows", () => {
  test("unauthenticated visitor is redirected to login on protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test("invalid credentials displays appropriate error feedback", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"], input[name="email"]').fill("invalid@example.com");
    await page.locator('input[type="password"], input[name="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[role="alert"], .text-rose-500, .bg-rose-500\\/10')).toBeVisible({ timeout: 5000 });
  });

  test("successful login authenticates and reaches dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"], input[name="email"]').fill("admin@example.com");
    await page.locator('input[type="password"], input[name="password"]').fill("password");
    await page.locator('button[type="submit"]').click();
    // Redirects to dashboard or remains on valid authenticated page
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
