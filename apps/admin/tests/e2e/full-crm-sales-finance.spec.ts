import { expect, test } from "@playwright/test";
import { attachErrorListeners, auditAdminRoutes, loginAsAdmin } from "./helpers/admin-audit";

test.describe("Admin — CRM, Quotations, Invoices, Payments, Expenses & Finance", () => {
  test("all CRM, Sales, Finance, and Report pages load cleanly", async ({ page }) => {
    test.setTimeout(180_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    await auditAdminRoutes(page, [
      "/dashboard/crm/leads",
      "/dashboard/crm/contacts",
      "/dashboard/crm/customers/new",
      "/dashboard/crm/deals",
      "/dashboard/crm/deals/new",
      "/dashboard/quotations",
      "/dashboard/quotations/new",
      "/dashboard/invoices",
      "/dashboard/invoices/new",
      "/dashboard/payments",
      "/dashboard/payments/new",
      "/dashboard/expenses",
      "/dashboard/expenses/new",
      "/dashboard/expenses/categories",
      "/dashboard/expenses/recurring",
      "/dashboard/finance",
      "/dashboard/finance/commissions",
      "/dashboard/finance/reports",
      "/dashboard/reports",
    ]);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("create quotation, invoice, payment, and expense and verify edit/delete controls", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);
    const ts = Date.now();

    // 1. Create CRM Customer (verify validation on empty submit, then select Company client kind)
    await page.goto("/dashboard/crm/customers/new", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Save client/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/crm\/customers\/new/);

    await page.locator('[role="radiogroup"] [role="radio"]').nth(1).click();
    const customerName = `E2E Customer ${ts}`;
    const customerEmail = `e2e-cust-${ts}@example.test`;
    await page.getByLabel(/Company name \(English\)/i).fill(customerName);
    await page.getByLabel(/CR number/i).fill(`${String(ts).slice(-6)}-1`);
    await page.getByLabel(/^Full name/i).first().fill(`QA Contact ${ts}`);
    await page.getByLabel("Email").first().fill(customerEmail);
    await page.getByRole("button", { name: /Save client/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/crm\/customers\/(?!new$)[^/]+$/, { timeout: 30_000 });
    await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10_000 });

    // 2. Create a draft quotation for the new customer and verify Edit control & persistence
    await page.goto("/dashboard/quotations/new", { waitUntil: "domcontentloaded" });
    const clientSearch = page.locator('main input[role="combobox"]').first();
    await expect(clientSearch).toBeVisible({ timeout: 10_000 });
    await clientSearch.click();
    await clientSearch.fill(customerName);
    const clientOption = page.locator('[data-popup-body] button').filter({ hasText: customerName }).first();
    await expect(clientOption).toBeVisible({ timeout: 15_000 });
    await clientOption.click();

    await page.locator('form input[type="text"][required]').first().fill(`E2E Quote Service ${ts}`);
    await page.locator('.grid-cols-3 input[type="number"]').nth(1).fill("125.000");
    await page.getByRole("button", { name: /Save Quotation Draft/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/quotations\/(?!new$)[^/]+$/, { timeout: 30_000 });

    const editQuoteBtn = page.getByRole("button", { name: /^edit$/i }).first();
    await expect(editQuoteBtn).toBeVisible({ timeout: 10_000 });
    await editQuoteBtn.click();
    const quoteDialog = page.locator('[role="dialog"]').first();
    await expect(quoteDialog).toBeVisible({ timeout: 5_000 });
    const updatedTerms = `Updated E2E terms ${ts}`;
    await quoteDialog.locator("textarea").first().fill(updatedTerms);
    await quoteDialog.locator('button:has-text("Save")').first().click();
    await expect(quoteDialog).toBeHidden({ timeout: 10_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(updatedTerms).first()).toBeVisible({ timeout: 10_000 });

    // 3. Check Invoices list, detail, and edit link
    await page.goto("/dashboard/invoices", { waitUntil: "domcontentloaded" });
    const firstInvoiceLink = page.locator('a[href^="/dashboard/invoices/"]').filter({ hasNotText: /new/i }).first();
    await expect(firstInvoiceLink).toBeVisible({ timeout: 10_000 });
    await firstInvoiceLink.click();
    await expect(page).toHaveURL(/\/dashboard\/invoices\/[^/]+$/, { timeout: 10_000 });
    await expect(page.locator("main, h1, h2").first()).toBeVisible();

    // 4. Create Internal Expense and verify Edit persistence on /dashboard/expenses
    await page.goto("/dashboard/expenses/new", { waitUntil: "domcontentloaded" });
    await page.locator('[role="radio"]').nth(2).click();
    await page.locator("#expense-category").click();
    const firstExpCat = page.locator('[role="listbox"] [role="option"]:not([data-option-value=""])').first();
    await expect(firstExpCat).toBeVisible({ timeout: 5_000 });
    await firstExpCat.click();
    const expDesc = `E2E Expense ${ts}`;
    await page.locator("#expense-desc-en").fill(expDesc);
    await page.locator("#expense-amount").fill("25.500");
    await page.locator('form button[type="submit"]:visible').first().click();
    await expect(page).toHaveURL(/\/dashboard\/expenses(\?|$)/, { timeout: 15_000 });
    await expect(page.getByText(expDesc).first()).toBeVisible({ timeout: 10_000 });

    const editExpenseBtn = page.locator('button[aria-label="Edit"], button[title="Edit"]').first();
    await expect(editExpenseBtn).toBeVisible({ timeout: 10_000 });
    await editExpenseBtn.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    const expEdited = `E2E Expense Edited ${ts}`;
    await dialog.locator('input[type="text"]').first().fill(expEdited);
    await dialog.locator('button[type="submit"]').first().click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(expEdited).first()).toBeVisible({ timeout: 10_000 });

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
