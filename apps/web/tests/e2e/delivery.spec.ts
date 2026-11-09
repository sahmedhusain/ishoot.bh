import { expect, test } from "@playwright/test";
import { en } from "@platform/locales";
import { alertMessage, testDatabase, watchErrors } from "../../helpers";
import {
  disableDelivery,
  enableDelivery,
  enableStore,
  freshStockedProduct,
} from "../../store-fixtures";

const copy = en.store;
const db = testDatabase();
let productId = "";
let zoneId = "";
let itemPath = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  zoneId = (await enableDelivery(db)).id;
  const items = await db.portfolioItem.findMany({
    orderBy: { displayOrder: "asc" },
    take: 3,
  });
  const item = items[2] ?? items[items.length - 1];
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
      sku: "E2E-DELIVERY",
      nameEn: "E2E Delivery Item",
      nameAr: "صنف التوصيل",
      price: 4,
      onHand: 10,
      catalogueItemId: item.id,
    })
  ).id;
});

test.afterAll(async () => {
  await disableDelivery(db);
  await db.$disconnect();
});

test("checkout prices delivery by zone, refuses areas not served, and books a delivery time", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto(itemPath);
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-to-cart").getByRole("spinbutton").fill("2");
  await page.getByTestId("add-to-cart-button").click();
  await expect(page.getByRole("link", { name: copy.viewCart })).toBeVisible();
  await page.goto("/en/checkout");
  await page.waitForLoadState("networkidle");
  const form = page.getByTestId("checkout-form");
  await form.locator('input[name="name"]').fill("Zone Buyer");
  await form.locator('input[name="email"]').fill("e2e-zone-buyer@example.test");
  await form.locator('input[name="phone"]').fill("+973 3600 0006");
  await form
    .locator("label")
    .filter({ hasText: new RegExp(`^${copy.fulfilments.delivery}$`) })
    .click();
  for (const [key, value] of [
    ["name", "Zone Buyer"],
    ["phone", "+973 3600 0006"],
    ["line1", "House 7, Road 12"],
    ["city", "Riffa"],
    ["country", "Bahrain"],
  ])
    await form.locator(`input[name="shipping-${key}"]`).fill(value);
  await expect(form.getByText(copy.problems.no_delivery_zone)).toBeVisible();
  await expect(page.getByTestId("checkout-place")).toBeDisabled();

  await form.locator('input[name="shipping-city"]').fill("Muharraq");
  await expect(form.getByText(copy.problems.no_delivery_zone)).toHaveCount(0);
  const slots = page.getByTestId("checkout-slots").getByRole("combobox");
  await expect(slots).toBeVisible();
  await slots.click();
  await page.getByRole("option").nth(2).click();
  const choice = await page
    .getByTestId("checkout-slots")
    .locator("select")
    .inputValue();
  await form.getByRole("radio", { name: copy.paymentMethods.cod }).check();
  await page.getByTestId("checkout-place").click();
  await expect(page.getByTestId("order-placed")).toContainText(
    /SO-\d{4}-\d{6}/,
    { timeout: 60_000 },
  );

  const order = await db.salesOrder.findFirstOrThrow({
    where: { lines: { some: { productId } } },
    orderBy: { placedAt: "desc" },
    include: { shipments: true },
  });
  expect(Number(order.deliveryFee)).toBe(1.5);
  expect(order.shipments).toHaveLength(1);
  const shipment = order.shipments[0];
  expect(shipment).toMatchObject({
    zoneId,
    status: "pending",
    slotId: choice.split("|")[1],
  });
  expect(shipment.slotDate?.toISOString().slice(0, 10)).toBe(
    choice.split("|")[0],
  );
  expect(Number(shipment.codAmount)).toBe(Number(order.total));

  await page.goto(`/en/track/${shipment.trackingToken}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    shipment.number,
  );
  await expect(
    page.getByTestId("track-steps").locator('[aria-current="step"]'),
  ).toContainText(copy.trackSteps.placed);
  await expect(page.getByTestId("track-state")).toContainText(
    shipment.slotStart!,
  );
  errors.assertClean();
});

test("a tracking link that was not issued shows nothing", async ({ page }) => {
  await page.goto("/en/track/not-a-real-tracking-token-000");
  await expect(alertMessage(page)).toHaveText(copy.trackNotFound);
});
