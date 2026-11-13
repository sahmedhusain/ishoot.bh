import { acceptConfirmations } from "./helpers/helpers";
import { expect, test, type Page } from "@playwright/test";
import { alertMessage, testDatabase, watchErrors } from "./helpers/helpers";
import { t } from "./helpers/locale";
import { setModule } from "./helpers/modules";

const copy = t.inventory;
const db = testDatabase();
const SKU = "E2E-STOCK";
let productId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await setModule("products", true);
  const old = await db.product.findMany({
    where: { sku: SKU },
    select: { id: true },
  });
  for (const { id } of old) {
    await db.stockCountLine.deleteMany({ where: { productId: id } });
    await db.stockMovement.deleteMany({ where: { productId: id } });
    await db.stockLevel.deleteMany({ where: { productId: id } });
    await db.stockItem.deleteMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });
  }
  productId = (
    await db.product.create({
      data: {
        sku: SKU,
        nameEn: "E2E Stock Item",
        nameAr: "صنف مخزون الاختبار",
        price: 10,
        cost: 3,
      },
    })
  ).id;
});

test.afterAll(async () => {
  await db.$disconnect();
});

async function changeStock(
  page: Page,
  type: "receipt" | "adjustment" | "write_off",
  quantity: string,
  unitCost?: string,
) {
  await page
    .getByRole("button", {
      name: copy.stock.changeFor.replace("{name}", "صنف مخزون الاختبار"),
      exact: true,
    })
    .click();
  const dialog = page.getByTestId("stock-change");
  await dialog.getByRole("radio", { name: copy.change.types[type] }).click();
  await dialog.locator('input[name="quantity"]').fill(quantity);
  if (unitCost) await dialog.locator('input[name="unitCost"]').fill(unitCost);
  await page.getByTestId("stock-change-save").click();
}

const onHand = async () =>
  Number(
    (
      await db.stockLevel.aggregate({
        where: { productId },
        _sum: { onHand: true },
      })
    )._sum.onHand ?? 0,
  );

test("stock moves only through the ledger: receipts set the average cost, nothing goes below zero", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto(`/dashboard/inventory?q=${SKU}`);
  await changeStock(page, "receipt", "20", "3");
  await expect(page.getByTestId("stock-change")).toHaveCount(0);
  await changeStock(page, "receipt", "10", "4.5");
  await expect(page.getByTestId("stock-change")).toHaveCount(0);
  await expect.poll(onHand).toBe(30);
  const item = await db.stockItem.findUnique({
    where: { productId_variantKey: { productId, variantKey: "" } },
  });
  expect(Number(item?.averageCost)).toBe(3.5);
  await expect(
    page.getByTestId("stock-table").getByRole("row").filter({ hasText: SKU }),
  ).toContainText("30");
  errors.assertClean();

  await changeStock(page, "write_off", "40");
  await expect(alertMessage(page)).toHaveText(
    t.serverErrors.messages.stockInsufficient,
  );
  await page.keyboard.press("Escape");
  expect(await onHand()).toBe(30);

  const later = watchErrors(page);
  await changeStock(page, "write_off", "2");
  await expect(page.getByTestId("stock-change")).toHaveCount(0);
  await expect.poll(onHand).toBe(28);
  const writeOff = await db.stockMovement.findFirst({
    where: { productId, type: "write_off" },
  });
  expect(Number(writeOff?.quantity)).toBe(-2);
  expect(writeOff?.reason).toBe("damaged");
  expect(Number(writeOff?.unitCost)).toBe(3.5);
  later.assertClean();
});

test("a reorder point alerts once when available stock falls to it", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto(`/dashboard/products/${productId}`);
  const panel = page.getByTestId("product-stock");
  await panel
    .getByRole("spinbutton", {
      name: new RegExp(`^${copy.product.reorderPoint}`),
    })
    .fill("30");
  await panel.getByRole("button", { name: copy.product.saveReorder }).click();
  await expect(panel.getByRole("status")).toHaveText(copy.product.reorderSaved);
  await page.goto(`/dashboard/inventory?q=${SKU}`);
  await changeStock(page, "receipt", "1", "3.5");
  await expect.poll(onHand).toBe(29);
  await expect(
    page.getByTestId("stock-table").getByText(copy.stock.low),
  ).toBeVisible();
  await expect
    .poll(() =>
      db.notification.count({
        where: {
          entityType: "product",
          entityId: productId,
          messageKey: "inventory.notifications.lowStock",
        },
      }),
    )
    .toBeGreaterThan(0);
  errors.assertClean();
});

test("a stock count is scanned, reviewed and approved into one adjustment", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/inventory/counts");
  await page.getByRole("button", { name: copy.counts.new }).click();
  await page.getByTestId("count-start").click();
  await expect(page).toHaveURL(
    /\/dashboard\/inventory\/counts\/[0-9a-f-]{36}$/,
    { timeout: 60_000 },
  );
  await page.locator('input[name="scan"]').fill(SKU);
  await page.locator('input[name="scan"]').press("Enter");
  const counted = page.getByRole("spinbutton", {
    name: new RegExp(`صنف مخزون الاختبار`),
  });
  await expect(counted).toBeFocused();
  await counted.fill("26");
  await page.getByTestId("count-submit").click();
  await expect(page.getByTestId("count-status")).toHaveText(
    copy.counts.statuses.review,
  );
  await acceptConfirmations(page);
  await page.getByTestId("count-approve").click();
  await expect(page.getByTestId("count-status")).toHaveText(
    copy.counts.statuses.approved,
  );
  await expect.poll(onHand).toBe(26);
  const adjustment = await db.stockMovement.findFirst({
    where: { productId, type: "count" },
  });
  expect(Number(adjustment?.quantity)).toBe(-3);

  await page.goto(`/dashboard/inventory/movements?productId=${productId}`);
  await expect(
    page.getByTestId("movements-table").locator("tbody tr"),
  ).toHaveCount(5);
  errors.assertClean();
});
