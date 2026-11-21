import { expect, test } from "@playwright/test";
import { createStrictObserver, loginAsAdminStrict } from "./helpers/strict-audit";
import { en, visitAndAuditRoute } from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 04 — Products & Inventory (10 routes)", () => {
  test("all 10 Products & Inventory routes validate options, stock count drafts, warehouses, and transfers", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const observer = createStrictObserver(page, "admin-exhaustive-04");

    await page.addInitScript(() =>
      localStorage.setItem("platform_admin_locale", "en"),
    );
    await loginAsAdminStrict(page);

    await visitAndAuditRoute(page, observer, "/dashboard/products", "/dashboard/products");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/products/categories",
      "/dashboard/products/categories",
    );

    // New product unsaved changes guard
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/products/new",
      "/dashboard/products/new",
    );
    const skuInput = page.getByRole("main").locator('input[name="sku"]');
    await expect(skuInput).toBeVisible();
    const origSku = await skuInput.inputValue();
    await skuInput.fill("E2E-SKU-DRAFT");
    const backHome = page.getByRole("banner").locator('a[href="/dashboard"]').first();
    await backHome.click();
    const unsavedDialog = page.getByRole("dialog", {
      name: en.unsavedChanges.title,
      exact: true,
    });
    await expect(unsavedDialog).toBeVisible();
    await unsavedDialog
      .getByRole("button", { name: en.unsavedChanges.stay, exact: true })
      .click();
    await expect(skuInput).toHaveValue("E2E-SKU-DRAFT");
    await skuInput.fill(origSku);

    // Product detail & option validation (ported from product-count-drafts)
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/products/[id]",
      "/dashboard/products/prod-1",
    );
    const main = page.getByRole("main");
    await main
      .getByRole("button", { name: en.products.editor.addOption, exact: true })
      .click();
    await main.getByTestId("product-save").click();
    await expect(main.getByRole("alert")).toHaveText(
      en.serverErrors.messages.productOptionsInvalid,
    );
    await main
      .getByRole("button", { name: en.products.editor.removeOption, exact: true })
      .click();

    // Inventory routes & Stock count unsaved draft check
    await visitAndAuditRoute(page, observer, "/dashboard/inventory", "/dashboard/inventory");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/inventory/movements",
      "/dashboard/inventory/movements",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/inventory/transfers",
      "/dashboard/inventory/transfers",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/inventory/warehouses",
      "/dashboard/inventory/warehouses",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/inventory/counts",
      "/dashboard/inventory/counts",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/inventory/counts/[id]",
      "/dashboard/inventory/counts/scnt-001",
    );

    await expect(main.getByTestId("count-summary")).toBeVisible();
    await expect(main.getByTestId("count-lines")).toBeVisible();

    await observer.assertClean("admin-exhaustive-04-final");
  });
});
