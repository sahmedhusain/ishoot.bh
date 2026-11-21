import { expect, test } from "@playwright/test";
import { attachErrorListeners, auditAdminRoutes, loginAsAdmin } from "./helpers/admin-audit";

test.describe("Admin — HR, Assets, Operations & CMS", () => {
  test("all HR, Directory, and Assets pages load cleanly", async ({ page }) => {
    test.setTimeout(300_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    await auditAdminRoutes(page, [
      "/dashboard/hr",
      "/dashboard/hr/employees",
      "/dashboard/hr/employees/new",
      "/dashboard/hr/employees/import",
      "/dashboard/hr/attendance",
      "/dashboard/hr/leave",
      "/dashboard/hr/payroll",
      "/dashboard/hr/gosi",
      "/dashboard/hr/pensions",
      "/dashboard/hr/requests",
      "/dashboard/hr/handovers",
      "/dashboard/hr/settlements",
      "/dashboard/hr/settlements/new",
      "/dashboard/hr/documents",
      "/dashboard/hr/supports",
      "/dashboard/directory",
      "/dashboard/directory/org",
      "/dashboard/department",
      "/dashboard/assets",
      "/dashboard/assets/new",
      "/dashboard/assets/categories",
    ]);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("all Operations pages load cleanly", async ({ page }) => {
    test.setTimeout(240_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    await auditAdminRoutes(page, [
      "/dashboard/it-support",
      "/dashboard/it-support/new",
      "/dashboard/legal",
      "/dashboard/letters",
      "/dashboard/letters/new",
      "/dashboard/claims",
      "/dashboard/claims/new",
      "/dashboard/approvals",
      "/dashboard/tasks",
      "/dashboard/tasks/projects",
      "/dashboard/calendar",
      "/dashboard/announcements",
      "/dashboard/announcements/new",
      "/dashboard/archive",
      "/dashboard/services",
      "/dashboard/press",
      "/dashboard/analytics",
      "/dashboard/company/documents",
      "/dashboard/company/documents/new",
      "/dashboard/requests",
      "/dashboard/requests/new",
    ]);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("all CMS pages load cleanly", async ({ page }) => {
    test.setTimeout(240_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    await auditAdminRoutes(page, [
      "/dashboard/cms/articles",
      "/dashboard/cms/banners",
      "/dashboard/cms/clients",
      "/dashboard/cms/equipment",
      "/dashboard/cms/faqs",
      "/dashboard/cms/menus",
      "/dashboard/cms/pages",
      "/dashboard/cms/portfolio",
      "/dashboard/cms/reviews",
      "/dashboard/cms/stats",
      "/dashboard/cms/website",
    ]);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("create employee with validation checks and verify asset edit button", async ({ page }) => {
    test.setTimeout(120_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);
    const ts = Date.now();

    // 1. Create Employee
    await page.goto("/dashboard/hr/employees/new", { waitUntil: "domcontentloaded" });
    await page.locator('button[type="submit"]:visible').first().click();
    await expect(page).toHaveURL(/\/dashboard\/hr\/employees\/new/);

    const firstEn = "E2EFirst";
    const lastEn = `Employee${ts}`;
    await page.getByLabel(/First Name \(English\)/i).fill(firstEn);
    await page.getByLabel(/Last Name \(English\)/i).fill(lastEn);
    await page.getByLabel(/^Email/i).first().fill(`e2e-emp-${ts}@example.test`);
    await page.locator('input[placeholder="e.g. Senior Specialist"]').fill("Operations QA Engineer");

    await page.getByRole("button", { name: /Save Employee Record/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/hr\/employees\/(?!new$)[^/]+$/, { timeout: 30_000 });
    await expect(page.getByText(`${firstEn} ${lastEn}`).first()).toBeVisible({ timeout: 10_000 });

    // 2. Verify Asset creation & detail page Edit control
    await page.goto("/dashboard/assets/new", { waitUntil: "domcontentloaded" });
    const assetNameInput = page.locator("form input[required]").first();
    await expect(assetNameInput).toBeVisible({ timeout: 10_000 });
    const assetName = `E2E Asset ${ts}`;
    await assetNameInput.fill(assetName);
    await page.locator('form button[type="submit"]').first().click();
    await expect(page).toHaveURL(/\/dashboard\/assets\/(?!new$)[^/]+$/, { timeout: 30_000 });

    const editAssetBtn = page.getByRole("button", { name: /^edit$/i }).first();
    await expect(editAssetBtn).toBeVisible({ timeout: 15_000 });
    await editAssetBtn.click();
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible({ timeout: 10_000 });

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
