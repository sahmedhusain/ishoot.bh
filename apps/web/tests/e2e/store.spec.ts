import { expect, test } from "@playwright/test";
import { en } from "@platform/locales";
import { testDatabase, watchErrors } from "../../helpers";
import {
  enableStore,
  freshStockedProduct,
  stockOf,
} from "../../store-fixtures";

const copy = en.store;
const db = testDatabase();
const COUPON = "E2ETEN";
let productId = "";
let itemPath = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  const item = await db.portfolioItem.findFirstOrThrow({
    orderBy: { displayOrder: "asc" },
  });
  const content = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const slug =
    (
      content.published as {
        config?: { collection?: { slug?: string } };
      } | null
    )?.config?.collection?.slug ?? "works";
  itemPath = `/en/${slug}/${item.slug}`;
  productId = (
    await freshStockedProduct(db, {
      sku: "E2E-SHOP",
      nameEn: "E2E Shop Item",
      nameAr: "صنف متجر الاختبار",
      price: 12.5,
      onHand: 3,
      catalogueItemId: item.id,
    })
  ).id;
  await db.coupon.deleteMany({ where: { code: COUPON } });
  await db.coupon.create({
    data: { code: COUPON, kind: "percent", value: 10 },
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("a visitor adds an item to the cart, applies a coupon and checks out as a guest; the stock is held", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto(itemPath);
  await expect(page.getByTestId("stock-state")).toHaveText(
    copy.onlyLeft.replace("{count}", "3"),
  );
  await page.getByTestId("add-to-cart").getByRole("spinbutton").fill("2");
  await page.getByTestId("add-to-cart-button").click();
  await page.getByRole("link", { name: copy.viewCart }).click();
  await expect(page.getByTestId("cart-lines")).toContainText("E2E Shop Item");
  await page.getByLabel(copy.coupon).fill(COUPON.toLowerCase());
  await page.getByRole("button", { name: copy.applyCoupon }).click();
  await expect(
    page.getByText(copy.couponApplied.replace("{code}", COUPON)),
  ).toBeVisible();
  await page.getByTestId("cart-checkout").click();

  const form = page.getByTestId("checkout-form");
  await form.locator('input[name="name"]').fill("Guest Buyer");
  await form
    .locator('input[name="email"]')
    .fill("e2e-guest-buyer@example.test");
  await form.locator('input[name="phone"]').fill("+973 3600 0003");
  for (const [key, value] of [
    ["name", "Guest Buyer"],
    ["phone", "+973 3600 0003"],
    ["line1", "Road 3"],
    ["city", "Manama"],
    ["country", "Bahrain"],
  ])
    await form.locator(`input[name="shipping-${key}"]`).fill(value);
  await form.getByRole("radio", { name: copy.paymentMethods.cod }).check();
  await page.getByTestId("checkout-place").click();
  await expect(page.getByTestId("order-placed")).toContainText(
    /SO-\d{4}-\d{6}/,
    { timeout: 60_000 },
  );

  const line = await db.salesOrderLine.findFirstOrThrow({
    where: { productId },
    include: { order: true },
  });
  expect(Number(line.quantity)).toBe(2);
  expect(Number(line.order.subtotal)).toBe(25);
  expect(Number(line.order.discountAmount)).toBe(2.5);
  expect(Number(line.order.deliveryFee)).toBe(1);
  expect(line.order.status).toBe("placed");
  expect(line.order.channel).toBe("website");
  expect(await stockOf(db, productId)).toEqual({ onHand: 3, reserved: 2 });
  expect(
    (await db.coupon.findUniqueOrThrow({ where: { code: COUPON } })).usedCount,
  ).toBe(1);
  // The cart is emptied, and only one is left to sell.
  await page.goto(itemPath);
  await expect(page.getByTestId("stock-state")).toHaveText(
    copy.onlyLeft.replace("{count}", "1"),
  );
  errors.assertClean();
});

test("the server refuses more than is left, whatever the browser sends", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/store/order", {
    headers: { origin: baseURL! },
    data: {
      lines: [{ productId, quantity: 5 }],
      fulfilment: "pickup",
      name: "Too Many",
      email: "e2e-too-many@example.test",
      phone: "+973 3600 0004",
      paymentMethod: "cod",
      locale: "en",
    },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).not.toBe("generic");
  expect(await stockOf(db, productId)).toEqual({ onHand: 3, reserved: 2 });
});
