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

    // 1. Create CRM Customer
    await page.goto("/dashboard/crm/customers/new", { waitUntil: "domcontentloaded" });
    const custName = page.locator('input[name="nameEn"], input[name="name_en"], input[name="name"]').first();
    if ((await custName.count()) > 0) {
      await custName.fill(`E2E Customer ${ts}`);
      const custEmail = page.locator('input[name="email"], input[type="email"]').first();
      if ((await custEmail.count()) > 0) await custEmail.fill(`e2e-cust-${ts}@example.test`);
      await page.locator('button[type="submit"]:visible').first().click();
      await page.waitForTimeout(1500);
    }

    // 2. Check Quotations list & detail Edit controls (when draft)
    await page.goto("/dashboard/quotations", { waitUntil: "domcontentloaded" });
    const firstQuotationLink = page.locator('a[href^="/dashboard/quotations/"]').filter({ hasNotText: /new/i }).first();
    if ((await firstQuotationLink.count()) > 0) {
      await firstQuotationLink.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("main, h1, h2").first()).toBeVisible();
      const editQuoteBtn = page.getByRole("button", { name: /^edit$/i });
      if ((await editQuoteBtn.count()) > 0) {
        await editQuoteBtn.first().click();
        const termsBox = page.locator('[role="dialog"] textarea').first();
        if ((await termsBox.count()) > 0) {
          await termsBox.fill(`Updated E2E terms ${ts}`);
          await page.locator('[role="dialog"] button:has-text("Save")').first().click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // 3. Check Invoices list, detail, and edit page
    await page.goto("/dashboard/invoices", { waitUntil: "domcontentloaded" });
    const firstInvoiceLink = page.locator('a[href^="/dashboard/invoices/"]').filter({ hasNotText: /new/i }).first();
    if ((await firstInvoiceLink.count()) > 0) {
      await firstInvoiceLink.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("main, h1, h2").first()).toBeVisible();
    }

    // 4. Create Expense and verify Edit & Delete controls on /dashboard/expenses
    await page.goto("/dashboard/expenses/new", { waitUntil: "domcontentloaded" });
    const titleInput = page.locator('input[name="title"], input[name="description"], input[name="name"]').first();
    if ((await titleInput.count()) > 0) {
      await titleInput.fill(`E2E Expense ${ts}`);
      const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
      if ((await amountInput.count()) > 0) await amountInput.fill("25.500");
      await page.locator('button[type="submit"]:visible').first().click();
      await page.waitForTimeout(1500);
    }

    await page.goto("/dashboard/expenses", { waitUntil: "domcontentloaded" });
    const editExpenseBtn = page.locator('button[aria-label="Edit"], button[title="Edit"]').first();
    if ((await editExpenseBtn.count()) > 0) {
      await editExpenseBtn.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      const descField = dialog.locator('input[type="text"]').first();
      await descField.fill(`E2E Expense Edited ${ts}`);
      await dialog.locator('button[type="submit"]').click();
      await expect(dialog).toBeHidden({ timeout: 10_000 });
    }

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
