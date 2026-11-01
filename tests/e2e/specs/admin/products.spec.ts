import { selectOption } from "../../select-option";
import { expect, test } from "@playwright/test";
import { alertMessage, testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";
import { setModule } from "../../modules";

const copy = t.products;
const db = testDatabase();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // The demo company is a media studio, which starts without the products module.
  await setModule("products", true);
  await db.product.deleteMany({ where: { sku: { startsWith: "E2E-" } } });
  await db.productCategory.deleteMany({ where: { nameEn: "E2E Clothing" } });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("a product with a category, options and variants is created, kept unique and found again", async ({
  page,
}) => {
  const errors = watchErrors(page);

  await page.goto("/dashboard/products/categories");
  await page.getByRole("button", { name: copy.categories.add }).click();
  const editor = page.getByTestId("category-editor");
  await editor.locator('input[name="categoryNameEn"]').fill("E2E Clothing");
  await editor.locator('input[name="categoryNameAr"]').fill("ملابس الاختبار");
  await editor.getByRole("button", { name: copy.categories.save }).click();
  await expect(page.getByText("ملابس الاختبار")).toBeVisible();

  await page.goto("/dashboard/products/new");
  await page.locator('input[name="productNameEn"]').fill("E2E Cotton T-shirt");
  await page.locator('input[name="productNameAr"]').fill("تيشيرت الاختبار");
  await page.locator('input[name="sku"]').fill("E2E-TEE");
  await selectOption(page.getByLabel(copy.editor.category), {
    label: "ملابس الاختبار",
  });
  await page.locator('input[name="price"]').fill("8.5");
  await page.locator('input[name="cost"]').fill("3.4");
  await expect(page.getByText("60%")).toBeVisible();
  await page.getByRole("button", { name: copy.editor.addOption }).click();
  await page.getByLabel(`${copy.editor.optionName} (بالإنجليزية)`).fill("Size");
  await page.getByLabel(`${copy.editor.optionName} (بالعربية)`).fill("المقاس");
  await page
    .getByLabel(`${copy.editor.optionValues} (بالإنجليزية)`)
    .fill("S, M, L");
  await page
    .getByLabel(`${copy.editor.optionValues} (بالعربية)`)
    .fill("صغير، متوسط، كبير");
  await expect(
    page.getByTestId("product-variants").locator("tbody tr"),
  ).toHaveCount(3);
  await page.getByRole("button", { name: copy.editor.fillSkus }).click();
  await expect(
    page
      .getByTestId("product-variants")
      .locator("tbody tr")
      .first()
      .locator("input")
      .first(),
  ).toHaveValue("E2E-TEE-S");
  await page.getByTestId("product-save").click();
  // Creating opens the new product's own page.
  await expect(page).toHaveURL(/\/dashboard\/products\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "تيشيرت الاختبار",
  );

  const saved = await db.product.findUnique({
    where: { sku: "E2E-TEE" },
    include: { variants: { orderBy: { sortOrder: "asc" } }, category: true },
  });
  expect(saved?.category?.nameEn).toBe("E2E Clothing");
  expect(saved?.variants.map((v) => v.sku)).toEqual([
    "E2E-TEE-S",
    "E2E-TEE-M",
    "E2E-TEE-L",
  ]);

  errors.assertClean();

  // A SKU used by a variant cannot be another product's SKU (the refused save is the only failed request).
  await page.goto("/dashboard/products/new");
  await page.locator('input[name="productNameEn"]').fill("E2E Duplicate");
  await page.locator('input[name="productNameAr"]').fill("مكرر الاختبار");
  await page.locator('input[name="sku"]').fill("E2E-TEE-M");
  await page.getByTestId("product-save").click();
  await expect(alertMessage(page)).toHaveText(
    t.serverErrors.messages.productCodeTaken,
  );
  const later = watchErrors(page);

  // The list finds the product by a variant's SKU.
  await page.goto("/dashboard/products?q=E2E-TEE-L");
  await expect(
    page.getByRole("link", { name: /تيشيرت الاختبار/ }),
  ).toBeVisible();
  later.assertClean();
});
