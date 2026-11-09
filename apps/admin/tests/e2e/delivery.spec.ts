import { selectOption } from "../../select-option";
import { acceptConfirmations } from "../../helpers";
import { expect, test } from "@playwright/test";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../helpers/locale";
import {
  disableDelivery,
  enableDelivery,
  enableStore,
  freshStockedProduct,
  stockOf,
} from "../../store-fixtures";

const copy = t.delivery;
const db = testDatabase();
const SKU = "E2E-SHIP";
let productId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  await enableDelivery(db);
  productId = (
    await freshStockedProduct(db, {
      sku: SKU,
      nameEn: "E2E Ship Item",
      nameAr: "صنف الشحن",
      price: 9,
      onHand: 6,
    })
  ).id;
});

test.afterAll(async () => {
  await disableDelivery(db);
  await db.$disconnect();
});

test("delivery zones and times are set up in delivery settings", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/delivery/settings");
  await expect(page.getByTestId("zones-list")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.getByRole("button", { name: copy.settings.addZone }).click();
  const editor = page.getByTestId("zone-editor");
  await editor.getByRole("textbox").first().fill("ساحل");
  await editor.locator('textarea[name="zoneAreas"]').fill("Amwaj\nDiyar");
  await editor.locator('input[name="zoneFee"]').fill("2.5");
  await page.getByTestId("zone-save").click();
  await expect(
    page.getByTestId("zones-list").locator("li").filter({ hasText: "Amwaj" }),
  ).toBeVisible();
  const zone = await db.deliveryZone.findFirstOrThrow({
    where: { areas: { has: "Amwaj" } },
  });
  expect(zone.areas).toEqual(["Amwaj", "Diyar"]);
  expect(Number(zone.fee)).toBe(2.5);

  const slots = page.getByTestId(`slots-${zone.id}`);
  await slots.getByRole("button", { name: copy.settings.addSlot }).click();
  await slots
    .getByText(copy.settings.weekdaysShort[5], { exact: true })
    .click();
  await slots
    .getByText(copy.settings.weekdaysShort[6], { exact: true })
    .click();
  await slots.locator('input[name="slotStart"]').fill("16:00");
  await slots.locator('input[name="slotEnd"]').fill("20:00");
  await slots.locator('input[name="slotCapacity"]').fill("8");
  await slots.getByTestId("slot-save").click();
  await expect
    .poll(() =>
      db.deliverySlot.count({
        where: { zoneId: zone.id, start: "16:00", capacity: 8 },
      }),
    )
    .toBe(2);
  errors.assertClean();
});

test("a phone order's shipment goes out, fails once with a reason, goes out again and is delivered with the cash", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await acceptConfirmations(page);
  await page.goto("/dashboard/orders/new");
  await expect(page.getByTestId("sale-search")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.getByTestId("sale-search").fill(SKU);
  await page.getByTestId("sale-search").press("Enter");
  await selectOption(page.getByLabel(t.orders.pos.channel), "phone");
  await page.locator('input[name="saleName"]').fill("Ship Buyer");
  await page.getByLabel(t.orders.pos.phone).fill("+973 3600 0007");
  await selectOption(page.getByLabel(t.orders.pos.fulfilment), "delivery");
  await page.getByLabel(t.orders.pos.address.line1).fill("House 1, Road 2");
  await page.getByLabel(t.orders.pos.address.city).fill("Muharraq");
  await page.getByLabel(t.orders.pos.address.country, { exact: true }).fill("Bahrain");
  await selectOption(page.getByTestId("sale-paid-with"), "cod");
  await page.getByTestId("sale-create").click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });
  const orderId = page.url().split("/").pop()!;
  const shipment = await db.shipment.findFirstOrThrow({ where: { orderId } });
  expect(shipment.status).toBe("pending");

  await page.goto("/dashboard/delivery?q=Ship%20Buyer");
  await page.getByTestId("shipments-list").getByRole("link").first().click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/delivery/${shipment.id}$`),
  );
  await page.getByTestId("shipment-move-out_for_delivery").click();
  await expect(page.getByTestId("shipment-status").first()).toHaveText(
    copy.statuses.out_for_delivery,
  );
  await expect
    .poll(
      async () =>
        (await db.salesOrder.findUniqueOrThrow({ where: { id: orderId } }))
          .status,
    )
    .toBe("shipped");
  expect(await stockOf(db, productId)).toEqual({ onHand: 5, reserved: 0 });

  await page.getByTestId("shipment-move-failed").click();
  await selectOption(page
    .locator('select[name="failureReason"]'), "customer_absent");
  await page.getByTestId("shipment-fail-save").click();
  await expect(page.getByTestId("shipment-status").first()).toHaveText(
    copy.statuses.failed,
  );
  await expect(page.getByTestId("shipment-history")).toContainText(
    copy.reasons.customer_absent,
  );

  await page.getByTestId("shipment-move-out_for_delivery").click();
  await expect(page.getByTestId("shipment-status").first()).toHaveText(
    copy.statuses.out_for_delivery,
  );
  const total = Number(
    (await db.salesOrder.findUniqueOrThrow({ where: { id: orderId } })).total,
  );
  expect(total).toBe(10.5);
  await expect(page.locator('input[name="codCollected"]')).toHaveValue("10.5");
  await page.getByTestId("shipment-move-delivered").click();
  await expect(page.getByTestId("shipment-status").first()).toHaveText(
    copy.statuses.delivered,
  );
  const done = await db.shipment.findUniqueOrThrow({
    where: { id: shipment.id },
  });
  expect(done.attempts).toBe(2);
  expect(Number(done.codCollected)).toBe(Number(done.codAmount));
  expect(
    (await db.salesOrder.findUniqueOrThrow({ where: { id: orderId } })).status,
  ).toBe("delivered");
  await expect(page.getByTestId("shipment-tracking-link")).toHaveValue(
    new RegExp(`/track/${done.trackingToken}$`),
  );
  errors.assertClean();
});
