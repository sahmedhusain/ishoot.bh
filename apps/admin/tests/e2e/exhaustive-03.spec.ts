import { expect, test } from "@playwright/test";
import {
  allowExpectedFailure,
  createStrictObserver,
  loginAsAdminStrict,
} from "./helpers/strict-audit";
import { assertPdfEndpoint, en, visitAndAuditRoute } from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 03 — Finance, Invoices, Payments, Expenses & Claims (16 routes)", () => {
  test("all 16 Finance routes audit controls, transactional draft guards, edit failure retention, and PDFs", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    const observer = createStrictObserver(page, "admin-exhaustive-03");

    await page.addInitScript(() =>
      localStorage.setItem("platform_admin_locale", "en"),
    );
    await loginAsAdminStrict(page);

    await visitAndAuditRoute(page, observer, "/dashboard/finance", "/dashboard/finance");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/finance/commissions",
      "/dashboard/finance/commissions",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/finance/reports",
      "/dashboard/finance/reports",
    );

    // Invoices
    await visitAndAuditRoute(page, observer, "/dashboard/invoices", "/dashboard/invoices");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/invoices/new",
      "/dashboard/invoices/new",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/invoices/[id]",
      "/dashboard/invoices/inv-001",
    );
    await assertPdfEndpoint(page, "/api/documents/inv-001/pdf?type=invoice");

    // Invoice edit confirmation failure retention (ported from transactional-guards)
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/invoices/[id]/edit",
      "/dashboard/invoices/inv-001/edit",
    );
    const main = page.getByRole("main");
    const notes = main.locator("textarea").first();
    await expect(notes).toBeVisible();
    const origNotes = await notes.inputValue();
    await notes.fill(`${origNotes} E2E-guard-check`);

    // Unsaved changes navigation stay guard
    const backNav = page.getByRole("banner").locator('a[href="/dashboard"]').first();
    await backNav.click();
    const unsavedDialog = page.getByRole("dialog", {
      name: en.unsavedChanges.title,
      exact: true,
    });
    await expect(unsavedDialog).toBeVisible();
    await unsavedDialog.getByRole("button", { name: en.unsavedChanges.stay, exact: true }).click();
    await expect(notes).toHaveValue(`${origNotes} E2E-guard-check`);

    // Intercept 500 error on edit confirmation save and assert dialog keeps user's draft
    await page.route("**/dashboard/invoices/inv-001/edit", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      return route.fulfill({ status: 500, body: "Expected E2E failure" });
    });
    await allowExpectedFailure(
      observer,
      { status: 500, urlPattern: /\/dashboard\/invoices\/inv-001\/edit/, requireHit: true },
      async () => {
        await main.locator('button[type="submit"]').click();
        const confirmDlg = page.getByRole("dialog");
        await expect(confirmDlg).toContainText("E2E-guard-check");
        await confirmDlg
          .getByRole("button", {
            name: en.editConfirmModal.confirmAndSaveChanges,
            exact: true,
          })
          .click();
        await expect(confirmDlg.getByRole("alert")).toBeVisible({ timeout: 10_000 });
        await confirmDlg
          .getByRole("button", { name: en.editConfirmModal.cancel, exact: true })
          .click();
      },
    );
    await page.unroute("**/dashboard/invoices/inv-001/edit");
    await notes.fill(origNotes);

    // Payments + Receipt PDF
    await visitAndAuditRoute(page, observer, "/dashboard/payments", "/dashboard/payments");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/payments/new",
      "/dashboard/payments/new",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/payments/[id]",
      "/dashboard/payments/pay-001",
    );
    await assertPdfEndpoint(page, "/api/documents/pay-001/pdf?type=receipt");

    // Expenses + Recurring + Categories + Unsaved draft check on /dashboard/expenses/new
    await visitAndAuditRoute(page, observer, "/dashboard/expenses", "/dashboard/expenses");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/expenses/categories",
      "/dashboard/expenses/categories",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/expenses/new",
      "/dashboard/expenses/new",
    );
    const expDesc = page
      .getByRole("main")
      .getByPlaceholder(en.expensesNew.descriptionPlaceholder, { exact: true });
    await expect(expDesc).toBeVisible();
    await expDesc.fill("E2E expense draft check");
    await backNav.click();
    await expect(unsavedDialog).toBeVisible();
    await unsavedDialog.getByRole("button", { name: en.unsavedChanges.stay, exact: true }).click();
    await expDesc.fill("");

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/expenses/recurring",
      "/dashboard/expenses/recurring",
    );

    // Expense Claims + validation
    await visitAndAuditRoute(page, observer, "/dashboard/claims", "/dashboard/claims");
    await visitAndAuditRoute(page, observer, "/dashboard/claims/new", "/dashboard/claims/new");
    const claimReason = page
      .getByRole("main")
      .getByPlaceholder(en.claims.reasonPlaceholder, { exact: true });
    await expect(claimReason).toBeVisible();
    await page.locator("main button[type='submit']").first().click();
    await expect(page).toHaveURL(/\/dashboard\/claims\/new$/);

    await observer.assertClean("admin-exhaustive-03-final");
  });
});
