import { expect, test } from "@playwright/test";
import { createStrictObserver, loginAsAdminStrict } from "./helpers/strict-audit";
import { assertPdfEndpoint, en, switchAdminLocale, visitAndAuditRoute } from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 06 — HR, Employees, Payroll, GOSI, Settlements & Directory (22 routes)", () => {
  test("all 22 HR and Directory routes audit forms, drafts, tabs, org chart, and settlement PDFs", async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const observer = createStrictObserver(page, "admin-exhaustive-06");

    await page.addInitScript(() => {
      if (!localStorage.getItem("platform_admin_locale")) {
        localStorage.setItem("platform_admin_locale", "en");
      }
    });
    await loginAsAdminStrict(page);

    await visitAndAuditRoute(page, observer, "/dashboard/hr", "/dashboard/hr");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/attendance",
      "/dashboard/hr/attendance",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/documents",
      "/dashboard/hr/documents",
    );
    await visitAndAuditRoute(page, observer, "/dashboard/hr/gosi", "/dashboard/hr/gosi", {
      expectedUrl: /\/dashboard\/hr\/pensions$/,
    });
    await visitAndAuditRoute(page, observer, "/dashboard/hr/leave", "/dashboard/hr/leave");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/payroll",
      "/dashboard/hr/payroll",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/payroll/items/[id]",
      "/dashboard/hr/payroll/items/pi-prun-2026-05-super-admin",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/pensions",
      "/dashboard/hr/pensions",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/requests",
      "/dashboard/hr/requests",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/settings",
      "/dashboard/hr/settings",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/supports",
      "/dashboard/hr/supports",
    );

    // Employees + Unsaved draft check on /dashboard/hr/employees/new
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/employees",
      "/dashboard/hr/employees",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/employees/new",
      "/dashboard/hr/employees/new",
    );
    const empFirst = page
      .getByRole("main")
      .getByPlaceholder(en.newEmployeeForm.eGAhmed, { exact: true });
    await expect(empFirst).toBeVisible();
    await empFirst.fill("E2E Employee Draft");
    await page.getByRole("banner").locator('a[href="/dashboard"]').first().click();
    const unsavedDialog = page.getByRole("dialog", {
      name: en.unsavedChanges.title,
      exact: true,
    });
    await expect(unsavedDialog).toBeVisible();
    await unsavedDialog
      .getByRole("button", { name: en.unsavedChanges.stay, exact: true })
      .click();
    await expect(empFirst).toHaveValue("E2E Employee Draft");
    await empFirst.fill("");

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/employees/import",
      "/dashboard/hr/employees/import",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/employees/[id]",
      "/dashboard/hr/employees/super-admin",
    );

    // Handovers & Settlements + PDF
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/handovers",
      "/dashboard/hr/handovers",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/handovers/[id]",
      "/dashboard/hr/handovers/hoc-1-1",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/settlements",
      "/dashboard/hr/settlements",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/settlements/new",
      "/dashboard/hr/settlements/new",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/hr/settlements/[id]",
      "/dashboard/hr/settlements/fset-1",
    );
    await assertPdfEndpoint(page, "/api/hr/settlements/fset-1/pdf");

    // Directory & Org chart (also check AR RTL)
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/directory",
      "/dashboard/directory",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/directory/org",
      "/dashboard/directory/org",
    );
    await switchAdminLocale(page, "ar");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/directory",
      "/dashboard/directory",
      { locale: "ar" },
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await observer.assertClean("admin-exhaustive-06-final");
  });
});
