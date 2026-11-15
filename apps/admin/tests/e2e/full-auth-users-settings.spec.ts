import { expect, test } from "@playwright/test";
import { attachErrorListeners, auditAdminRoutes, loginAsAdmin } from "./helpers/admin-audit";

test.describe("Admin — Auth, Users, Roles & All Settings Pages", () => {
  test("login validates invalid credentials and redirects unauthenticated users", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);

    await page.locator("#login-username:visible").fill("BA0001");
    await page.locator("#login-password:visible").fill("WrongPassword999!");
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('[role="alert"]:visible').first()).toBeVisible({ timeout: 10_000 });

    await page.goto("/login/forgot", { waitUntil: "domcontentloaded" });
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("all settings, profile, team, and user pages load cleanly with tabs exercised", async ({ page }) => {
    test.setTimeout(360_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    await auditAdminRoutes(page, [
      "/dashboard",
      "/dashboard/profile",
      "/dashboard/users",
      "/dashboard/users/new",
      "/dashboard/team",
      "/dashboard/settings",
      "/dashboard/settings/company",
      "/dashboard/settings/departments",
      "/dashboard/settings/approvals",
      "/dashboard/settings/audit",
      "/dashboard/settings/pipeline",
      "/dashboard/settings/preferences",
      "/dashboard/settings/privacy",
      "/dashboard/settings/roles",
      "/dashboard/settings/security",
      "/dashboard/settings/web",
      "/dashboard/requests/settings",
      "/dashboard/hr/settings",
      "/dashboard/delivery/settings",
    ]);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("create new user with validation checks", async ({ page }) => {
    test.setTimeout(120_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    const ts = Date.now();
    await page.goto("/dashboard/users/new", { waitUntil: "domcontentloaded" });

    // Submit empty form -> should stay on /new (HTML5 / custom validation)
    await page.locator('button[type="submit"]:visible').first().click();
    await expect(page).toHaveURL(/\/dashboard\/users\/new/);

    // Fill valid user details
    const nameEn = page.locator('input[name="nameEn"], input[name="name_en"], input[name="name"]').first();
    if ((await nameEn.count()) > 0) await nameEn.fill(`E2E User ${ts}`);

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if ((await emailInput.count()) > 0) await emailInput.fill(`e2e-user-${ts}@example.test`);

    const usernameInput = page.locator('input[name="username"]').first();
    if ((await usernameInput.count()) > 0) await usernameInput.fill(`e2eu${ts.toString().slice(-6)}`);

    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    if ((await passwordInput.count()) > 0) await passwordInput.fill(`UserPass!${ts}`);

    await page.locator('button[type="submit"]:visible').first().click();
    await page.waitForTimeout(1500);

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
