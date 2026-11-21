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
    const empFirst = "E2EStaff";
    const empLast = `User${ts}`;
    const empEmail = `e2e-emp-link-${ts}@example.test`;

    // 1. Create an unlinked employee first so NewUserFormView always has an employee to link
    await page.goto("/dashboard/hr/employees/new", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/First Name \(English\)/i).fill(empFirst);
    await page.getByLabel(/Last Name \(English\)/i).fill(empLast);
    await page.getByLabel(/^Email/i).first().fill(empEmail);
    await page.locator('input[placeholder="e.g. Senior Specialist"]').fill("QA Test Specialist");
    await page.getByRole("button", { name: /Save Employee Record/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/hr\/employees\/(?!new$)[^/]+$/, { timeout: 30_000 });

    // 2. Navigate to /dashboard/users/new and verify empty submit validation stays on /new
    await page.goto("/dashboard/users/new", { waitUntil: "domcontentloaded" });
    await page.locator('button[type="submit"]:visible').first().click();
    await expect(page).toHaveURL(/\/dashboard\/users\/new/);

    // 3. Fill valid user details via real comboboxes and labeled inputs
    const combos = page.locator('button[role="combobox"]:visible');
    await expect(combos.first()).toBeVisible({ timeout: 10_000 });
    await combos.nth(0).click();
    const empOption = page
      .locator('[role="listbox"] [role="option"]')
      .filter({ hasText: `${empFirst} ${empLast}` })
      .first();
    await expect(empOption).toBeVisible({ timeout: 5_000 });
    await empOption.click();

    await page.getByPlaceholder("e.g. Sayed Ahmed").fill(`${empFirst} ${empLast}`);
    const userEmail = `e2e-user-${ts}@example.test`;
    await page.locator('input[type="email"]').first().fill(userEmail);
    await page.locator('input[type="password"]').first().fill(`UserPass!${ts}A`);

    await combos.nth(1).click();
    const roleOption = page.locator('[role="listbox"] [role="option"]:not([data-option-value=""])').first();
    await expect(roleOption).toBeVisible({ timeout: 5_000 });
    await roleOption.click();

    await page.getByRole("button", { name: /Create User Account/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/users(\?|$)/, { timeout: 30_000 });
    await expect(page.getByText(userEmail)).toBeVisible({ timeout: 10_000 });

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
