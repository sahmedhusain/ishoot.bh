import { expect, test } from "@playwright/test";
import { createStrictObserver, loginAsAdminStrict } from "./helpers/strict-audit";
import { assertPdfEndpoint, en, visitAndAuditRoute } from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 05 — Procurement, Suppliers, RFQs, Requisitions, POs & Bills (12 routes)", () => {
  test("all 12 Procurement routes render, open modals, exercise forms/lines, and serve PO PDFs", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    const observer = createStrictObserver(page, "admin-exhaustive-05");

    await page.addInitScript(() => {
      if (!localStorage.getItem("platform_admin_locale")) {
        localStorage.setItem("platform_admin_locale", "en");
      }
    });
    await loginAsAdminStrict(page);

    // Suppliers + inline New Supplier editor check
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/suppliers",
      "/dashboard/procurement/suppliers",
    );
    const newSupplierBtn = page
      .getByRole("main")
      .getByRole("button", { name: new RegExp(en.procurement.suppliers.add, "i") })
      .first();
    await expect(newSupplierBtn).toBeVisible();
    await newSupplierBtn.click();
    const supplierEditor = page.getByTestId("supplier-editor");
    await expect(supplierEditor).toBeVisible();
    await supplierEditor.locator('input[name="supplier-companyName"]').fill("E2E Supplier Draft");
    await expect(page.getByTestId("supplier-save")).toBeVisible();
    await supplierEditor
      .getByRole("button", { name: en.procurement.common.cancel, exact: true })
      .click();
    await expect(supplierEditor).toHaveCount(0);

    // RFQs
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/rfqs",
      "/dashboard/procurement/rfqs",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/rfqs/[id]",
      "/dashboard/procurement/rfqs/rfq-001",
    );

    // Requisitions
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/requisitions",
      "/dashboard/procurement/requisitions",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/requisitions/new",
      "/dashboard/procurement/requisitions/new",
    );
    await expect(page.getByTestId("requisition-save")).toBeVisible();
    await expect(page.getByTestId("requisition-submit")).toBeVisible();
    const reqNoteInput = page.locator("main input").nth(1);
    await reqNoteInput.fill("E2E Requisition Draft Note");
    await expect(reqNoteInput).toHaveValue("E2E Requisition Draft Note");

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/requisitions/[id]",
      "/dashboard/procurement/requisitions/preq-001",
    );

    // Purchase Orders + PO PDF
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/orders",
      "/dashboard/procurement/orders",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/orders/new",
      "/dashboard/procurement/orders/new",
    );
    await expect(page.getByTestId("order-save")).toBeVisible();
    await expect(page.getByTestId("order-submit")).toBeVisible();

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/orders/[id]",
      "/dashboard/procurement/orders/po-001",
    );
    await assertPdfEndpoint(page, "/api/procurement/orders/po-001/pdf");

    // Supplier Bills
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/bills",
      "/dashboard/procurement/bills",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/bills/new",
      "/dashboard/procurement/bills/new",
    );
    await expect(page.getByTestId("bill-save")).toBeVisible();

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/procurement/bills/[id]",
      "/dashboard/procurement/bills/sbill-001",
    );

    await observer.assertClean("admin-exhaustive-05-final");
  });
});
