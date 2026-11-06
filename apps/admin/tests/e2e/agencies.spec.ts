import { selectOption } from "../../select-option";
import { acceptConfirmations } from "../../helpers";
import { expect, test } from "@playwright/test";
import { en } from "../../locales";
import { ports } from "../../playwright.config";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../helpers/locale";
import {
  disableDelivery,
  enableDelivery,
  enableStore,
  freshStockedProduct,
} from "../../store-fixtures";

const copy = t.delivery;
const db = testDatabase();
const web = `http://localhost:${ports.web}`;
const AGENCY = "E2E Couriers";
let productId = "";
let shipmentId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  await enableDelivery(db);
  const old = await db.courierAgency.findMany({
    where: { name: AGENCY },
    select: { id: true },
  });
  await db.shipment.updateMany({
    where: { agencyId: { in: old.map((a) => a.id) } },
    data: { agencyId: null, agencyInvoiceId: null, codSettlementId: null },
  });
  await db.codSettlement.deleteMany({
    where: { agencyId: { in: old.map((a) => a.id) } },
  });
  await db.agencyInvoice.deleteMany({
    where: { agencyId: { in: old.map((a) => a.id) } },
  });
  await db.courierAgency.deleteMany({ where: { name: AGENCY } });
  productId = (
    await freshStockedProduct(db, {
      sku: "E2E-AGENCY",
      nameEn: "E2E Agency Item",
      nameAr: "صنف شركة الشحن",
      price: 7,
      onHand: 5,
    })
  ).id;
});

test.afterAll(async () => {
  await disableDelivery(db);
  await db.$disconnect();
});

test("a shipment handed to a courier agency is tracked at the agency and invoiced as a delivery expense", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await acceptConfirmations(page);
  await page.goto("/dashboard/delivery/agencies");
  await page.getByRole("button", { name: copy.agencies.add }).first().click();
  await page.locator('input[name="agencyName"]').fill(AGENCY);
  await page
    .locator('input[name="agencyTrackingUrl"]')
    .fill("https://track.example.test/?n={tracking}");
  await page.locator('input[name="agencyFee"]').fill("1.25");
  await page.getByTestId("agency-save").first().click();
  await expect(page.getByTestId("agencies-list").first()).toContainText(AGENCY);

  const response = await page.request.post(`${web}/api/store/order`, {
    headers: { origin: web },
    data: {
      lines: [{ productId, quantity: 1 }],
      fulfilment: "delivery",
      address: {
        name: "Agency Buyer",
        phone: "+973 3600 0009",
        line1: "Road 9",
        city: "Muharraq",
        country: "Bahrain",
      },
      name: "Agency Buyer",
      email: "e2e-agency-buyer@example.test",
      phone: "+973 3600 0009",
      paymentMethod: "cod",
      locale: "en",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const shipment = await db.shipment.findFirstOrThrow({
    where: { order: { lines: { some: { productId } } } },
    orderBy: { createdAt: "desc" },
  });
  shipmentId = shipment.id;

  await page.goto(`/dashboard/delivery/${shipmentId}`);
  const panel = page.getByTestId("shipment-agency").first();
  await selectOption(panel.locator('select[name="agencyId"]'), {
    label: AGENCY,
  });
  await panel.locator('input[name="trackingNumber"]').fill("TRK-778899");
  await page.getByTestId("shipment-handover").first().click();
  await expect(page.getByTestId("shipment-tracking-number").first()).toHaveText(
    "TRK-778899",
  );
  const handed = await db.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
  });
  expect(handed).toMatchObject({
    method: "agency",
    status: "assigned",
    trackingNumber: "TRK-778899",
  });
  expect(Number(handed.agencyFee)).toBe(1.25);

  // The customer sees who carries it and can track it there.
  const customer = await page.context().newPage();
  await customer.goto(`${web}/en/track/${handed.trackingToken}`);
  await expect(customer.getByTestId("track-agency")).toContainText(
    en.store.trackAgency
      .replace("{agency}", AGENCY)
      .replace("{number}", "TRK-778899"),
  );
  await expect(
    customer.getByRole("link", {
      name: en.store.trackAtAgency.replace("{agency}", AGENCY),
    }),
  ).toHaveAttribute("href", "https://track.example.test/?n=TRK-778899");
  await customer.close();

  await page.getByTestId("shipment-move-out_for_delivery").first().click();
  await expect(page.getByTestId("shipment-status").first()).toHaveText(
    copy.statuses.out_for_delivery,
  );
  await page.getByTestId("shipment-move-delivered").first().click();
  await expect(page.getByTestId("shipment-status").first()).toHaveText(
    copy.statuses.delivered,
  );

  await page.goto("/dashboard/delivery/agencies");
  await page
    .getByTestId("agencies-list")
    .first()
    .locator("li")
    .filter({ hasText: AGENCY })
    .getByTestId("agency-invoice-open")
    .click();
  const form = page.getByTestId("agency-invoice-form").first();
  await form.locator('input[name="invoiceReference"]').fill("INV-E2E-1");
  await form.locator('input[name="invoiceAmount"]').fill("1.5");
  await form.getByTestId("agency-invoice-save").click();
  await expect(
    page.getByRole("main").getByTestId("agency-invoices"),
  ).toContainText("INV-E2E-1");
  const invoice = await db.agencyInvoice.findFirstOrThrow({
    where: { reference: "INV-E2E-1" },
    include: { shipments: true },
  });
  expect(invoice.shipments.map((s) => s.id)).toContain(shipmentId);
  const expense = await db.expense.findUniqueOrThrow({
    where: { id: invoice.expenseId! },
    include: { category: true },
  });
  expect(Number(expense.amount)).toBe(1.5);
  expect(expense.category.slug).toBe("delivery");
  await expect(
    page.getByRole("main").getByTestId("agency-invoices"),
  ).toContainText(copy.agencies.difference);
  errors.assertClean();
});

test("the agency remits the cash it collected, paying the order", async ({
  page,
}) => {
  const errors = watchErrors(page);
  const shipment = await db.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
  });
  expect(Number(shipment.codCollected)).toBeGreaterThan(0);
  await page.goto("/dashboard/delivery/cash");
  const card = page
    .getByTestId("cash-agency")
    .filter({ hasText: AGENCY })
    .first();
  await card
    .locator('input[name="cashReceived"]')
    .fill(String(Number(shipment.codCollected)));
  await card.getByTestId("cash-settle").click();
  await expect(page.getByTestId("cash-history").first()).toContainText(AGENCY);
  const settlement = await db.codSettlement.findFirstOrThrow({
    where: { agencyId: shipment.agencyId },
    orderBy: { settledAt: "desc" },
  });
  expect(settlement.driverId).toBeNull();
  expect(Number(settlement.received)).toBe(Number(shipment.codCollected));
  const order = await db.salesOrder.findUniqueOrThrow({
    where: { id: shipment.orderId },
  });
  expect(order.paymentStatus).toBe("paid");
  errors.assertClean();
});
