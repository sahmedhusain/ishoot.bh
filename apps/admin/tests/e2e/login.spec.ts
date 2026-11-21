import { test, expect } from "@playwright/test";
import { admin } from "./helpers/helpers";

test.describe("Authentication Flows", () => {
  test("unauthenticated visitor is redirected to login on protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/);
    await expect(page.locator("#login-username:visible")).toBeVisible();
  });

  test("invalid credentials displays appropriate error feedback", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-username:visible").fill("BA0001");
    await page.locator("#login-password:visible").fill("WrongPassword999!");
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('[role="alert"]#login-error:visible')).toBeVisible({ timeout: 10_000 });
  });

  test("successful login authenticates and reaches dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-username:visible").fill(admin.username);
    await page.locator("#login-password:visible").fill(admin.password);
    await page.locator('button[type="submit"]:visible').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
