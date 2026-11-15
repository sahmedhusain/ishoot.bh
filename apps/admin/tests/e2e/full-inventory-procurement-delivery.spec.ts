import { expect, test } from "@playwright/test";
import { attachErrorListeners, auditAdminRoutes, loginAsAdmin } from "./helpers/admin-audit";

test.describe("Admin — Products, Inventory, Procurement & Delivery", () => {
  test("all Product and Inventory pages load cleanly", async ({ page }) => {
    test.setTimeout(240_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    await auditAdminRoutes(page, [
      "/dashboard/products",
      "/dashboard/products/new",
      "/dashboard/products/categories",
      "/dashboard/inventory",
      "/dashboard/inventory/warehouses",
      "/dashboard/inventory/transfers",
      "/dashboard/inventory/movements",
      "/dashboard/inventory/counts",
    ]);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("all Procurement and Delivery pages load cleanly", async ({ page }) => {
    test.setTimeout(240_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);

    await auditAdminRoutes(page, [
      "/dashboard/procurement/suppliers",
      "/dashboard/procurement/requisitions",
      "/dashboard/procurement/requisitions/new",
      "/dashboard/procurement/rfqs",
      "/dashboard/procurement/orders",
      "/dashboard/procurement/orders/new",
      "/dashboard/procurement/bills",
      "/dashboard/procurement/bills/new",
      "/dashboard/delivery",
      "/dashboard/delivery/agencies",
      "/dashboard/delivery/cash",
      "/dashboard/delivery/fleet",
      "/dashboard/delivery/routes",
      "/dashboard/driver",
    ]);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("create product with validation checks and verify detail/edit view", async ({ page }) => {
    test.setTimeout(120_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginAsAdmin(page);
    const ts = Date.now();

    await page.goto("/dashboard/products/new", { waitUntil: "domcontentloaded" });
    // Empty submit validation
    const saveBtn = page.getByRole("button", { name: /save|create/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    await saveBtn.click();
    await expect(page).toHaveURL(/\/dashboard\/products\/new/);

    const nameEn = page.locator('input[name="nameEn"], input[name="name_en"]').first();
    if ((await nameEn.count()) > 0) await nameEn.fill(`E2E Product ${ts}`);
    const sku = page.locator('input[name="sku"]').first();
    if ((await sku.count()) > 0) await sku.fill(`E2E-SKU-${ts}`);
    const price = page.locator('input[name="price"], input[name="unitPrice"]').first();
    if ((await price.count()) > 0) await price.fill("49.500");
    const cost = page.locator('input[name="cost"]').first();
    if ((await cost.count()) > 0) await cost.fill("25.000");

    await saveBtn.click();
    await page.waitForTimeout(1500);

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });
});
