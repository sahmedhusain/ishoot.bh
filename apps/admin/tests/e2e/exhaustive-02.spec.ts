import { expect, test } from "@playwright/test";
import { createStrictObserver, loginAsAdminStrict } from "./helpers/strict-audit";
import { assertPdfEndpoint, en, switchAdminLocale, visitAndAuditRoute } from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 02 — CRM, Sales, Quotations, Orders, Requests & Reports (22 routes)", () => {
  test("all 22 CRM, Quotation, Order, Service Request, and Report routes validate forms, dialogs, PDFs, and social insights", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    const observer = createStrictObserver(page, "admin-exhaustive-02");

    await page.addInitScript(() => {
      if (!localStorage.getItem("platform_admin_locale")) {
        localStorage.setItem("platform_admin_locale", "en");
      }
    });
    await loginAsAdminStrict(page);

    // CRM Contacts & Leads
    await visitAndAuditRoute(page, observer, "/dashboard/crm/contacts", "/dashboard/crm/contacts");
    await visitAndAuditRoute(page, observer, "/dashboard/crm/leads", "/dashboard/crm/leads");

    // CRM Customer New + validation
    await visitAndAuditRoute(page, observer, "/dashboard/crm/customers/new", "/dashboard/crm/customers/new");
    await page.getByRole("button", { name: /Save client/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/crm\/customers\/new$/);

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/crm/customers/[id]",
      "/dashboard/crm/customers/cnt-1",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/crm/customers/[id]/edit",
      "/dashboard/crm/customers/cnt-1/edit",
    );

    // CRM Deals + Deal Edit confirmation cancel test
    await visitAndAuditRoute(page, observer, "/dashboard/crm/deals", "/dashboard/crm/deals");
    await visitAndAuditRoute(page, observer, "/dashboard/crm/deals/new", "/dashboard/crm/deals/new");
    await page.locator("main button[type='submit']").first().click();
    await expect(page).toHaveURL(/\/dashboard\/crm\/deals\/new$/);

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/crm/deals/[id]",
      "/dashboard/crm/deals/deal-1",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/crm/deals/[id]/edit",
      "/dashboard/crm/deals/deal-1/edit",
    );
    const dealTitleInput = page
      .getByRole("main")
      .getByPlaceholder(en.dealEdit.titlePlaceholder, { exact: true });
    await expect(dealTitleInput).toBeVisible();
    const origDealTitle = await dealTitleInput.inputValue();
    await dealTitleInput.fill(`${origDealTitle} E2E Check`);
    await page.locator("main button[type='submit']").first().click();
    const editConfirm = page.getByRole("dialog");
    await expect(editConfirm).toBeVisible();
    await editConfirm
      .getByRole("button", { name: en.editConfirmModal.cancel, exact: true })
      .click();
    await expect(editConfirm).toHaveCount(0);
    await dealTitleInput.fill(origDealTitle);

    // Quotations + PDF verification
    await visitAndAuditRoute(page, observer, "/dashboard/quotations", "/dashboard/quotations");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/quotations/new",
      "/dashboard/quotations/new",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/quotations/[id]",
      "/dashboard/quotations/qt-001",
    );
    await assertPdfEndpoint(page, "/api/documents/qt-001/pdf?type=quotation");

    // Orders & POS
    await visitAndAuditRoute(page, observer, "/dashboard/orders", "/dashboard/orders");
    await visitAndAuditRoute(page, observer, "/dashboard/orders/new", "/dashboard/orders/new");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/orders/settings",
      "/dashboard/orders/settings",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/orders/[id]",
      "/dashboard/orders/ord-001",
    );

    // Reports & Dynamic Report Key
    await visitAndAuditRoute(page, observer, "/dashboard/reports", "/dashboard/reports");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/reports/[key]",
      "/dashboard/reports/sales_by_product",
    );

    // Service Requests
    await visitAndAuditRoute(page, observer, "/dashboard/requests", "/dashboard/requests");
    await visitAndAuditRoute(page, observer, "/dashboard/requests/new", "/dashboard/requests/new");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/requests/settings",
      "/dashboard/requests/settings",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/requests/[id]",
      "/dashboard/requests/inq-1",
    );

    // Ported social-owner-insights scenario check: query analytics per platform & AR RTL check on CRM contacts
    await page.goto("/dashboard/analytics?platform=youtube", { waitUntil: "load" });
    await expect(page.getByRole("main")).toBeVisible();
    await switchAdminLocale(page, "ar");
    await visitAndAuditRoute(page, observer, "/dashboard/crm/contacts", "/dashboard/crm/contacts", {
      locale: "ar",
    });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await observer.assertClean("admin-exhaustive-02-final");
  });
});
