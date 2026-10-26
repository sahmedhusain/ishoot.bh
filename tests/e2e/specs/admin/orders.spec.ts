import { acceptConfirmations } from "../../helpers";
import { expect, test } from "@playwright/test";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";
import {
  enableStore,
  freshStockedProduct,
  stockOf,
} from "../../store-fixtures";

const copy = t.orders;
const db = testDatabase();
const SKU = "E2E-COUNTER";
let productId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  productId = (
    await freshStockedProduct(db, {
      sku: SKU,
      nameEn: "E2E Counter Item",
      nameAr: "صنف البيع المباشر",
      price: 4,
      onHand: 10,
    })
  ).id;
});

test.afterAll(async () => {
  await db.$disconnect();
});

async function startSale(
  page: import("@playwright/test").Page,
  quantity: string,
) {
  await page.goto("/dashboard/orders/new");
  // In development a Fast Refresh (another route compiling) can briefly mount the page twice; act once settled.
  await expect(page.getByTestId("sale-search")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.getByTestId("sale-search").fill(SKU);
  // A scanner types the code and presses Enter.
  await page.getByTestId("sale-search").press("Enter");
  await page.getByTestId("sale-lines").getByRole("spinbutton").fill(quantity);
  await expect(page.getByTestId("sale-total")).toContainText(
    String(Number(quantity) * 4),
  );
}

test("a counter sale paid in cash is handed over at once and takes the stock", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await startSale(page, "2");
  await page.getByTestId("sale-create").click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    copy.statuses.delivered,
  );
  const order = await db.salesOrder.findFirstOrThrow({
    where: { lines: { some: { productId } } },
    orderBy: { placedAt: "desc" },
  });
  expect(order.channel).toBe("pos");
  expect(order.paymentStatus).toBe("paid");
  expect(await stockOf(db, productId)).toEqual({ onHand: 8, reserved: 0 });
  const sale = await db.stockMovement.findFirstOrThrow({
    where: { productId, type: "sale" },
  });
  expect(Number(sale.quantity)).toBe(-2);
  errors.assertClean();
});

test("a phone order is paid later (which invoices it), packed and shipped, and partly refunded", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await acceptConfirmations(page);
  await startSale(page, "1");
  await page.getByLabel(copy.pos.channel).selectOption("phone");
  await page.locator('input[name="saleName"]').fill("Phone Buyer");
  await page.getByTestId("sale-paid-with").selectOption("");
  await page.getByTestId("sale-create").click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });
  const id = page.url().split("/").pop()!;
  expect(await stockOf(db, productId)).toEqual({ onHand: 8, reserved: 1 });

  await page.getByTestId("order-pay").click();
  await expect
    .poll(
      async () =>
        (await db.salesOrder.findUniqueOrThrow({ where: { id } }))
          .paymentStatus,
    )
    .toBe("paid");
  await page.getByTestId("order-move-packing").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    copy.statuses.packing,
  );
  await page.getByTestId("order-move-shipped").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    copy.statuses.shipped,
  );
  expect(await stockOf(db, productId)).toEqual({ onHand: 7, reserved: 0 });

  // Taking the payment issued the invoice it is recorded against.
  await expect(page.getByTestId("order-invoice")).toBeVisible();
  await page.locator('input[name="refundAmount"]').fill("1.5");
  await page.getByTestId("order-refund").click();
  await expect
    .poll(async () =>
      Number(
        (await db.salesOrder.findUniqueOrThrow({ where: { id } }))
          .amountRefunded,
      ),
    )
    .toBe(1.5);
  await expect(page.getByTestId("order-history")).toContainText(
    copy.statuses.shipped,
  );
  errors.assertClean();
});

test("the orders list finds an order by its customer", async ({ page }) => {
  await page.goto("/dashboard/orders?q=Phone%20Buyer");
  await expect(page.getByTestId("orders-list").getByRole("link")).toHaveCount(
    1,
  );
});

test("store settings set the delivery fee, and a coupon is created", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await db.coupon.deleteMany({ where: { code: "E2EFIVE" } });
  await page.goto("/dashboard/orders/settings");
  // A first compile in development can briefly mount the page twice; act once it has settled.
  await expect(page.locator('input[name="deliveryFee"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.locator('input[name="deliveryFee"]').fill("1.5");
  await page.getByTestId("store-settings-save").click();
  await expect(page.getByRole("status")).toHaveText(copy.settings.saved);
  await expect
    .poll(async () =>
      Number(
        (await db.storeSettings.findUniqueOrThrow({ where: { id: "default" } }))
          .deliveryFee,
      ),
    )
    .toBe(1.5);

  await page.getByRole("button", { name: copy.settings.addCoupon }).click();
  await page.locator('input[name="couponCode"]').fill("e2efive");
  await page.locator('input[name="couponValue"]').fill("5");
  await page.getByTestId("coupon-save").click();
  await expect(page.getByRole("button", { name: "E2EFIVE" })).toBeVisible();
  expect(
    Number(
      (await db.coupon.findUniqueOrThrow({ where: { code: "E2EFIVE" } })).value,
    ),
  ).toBe(5);
  errors.assertClean();
});
