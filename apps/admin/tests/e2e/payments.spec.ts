import { selectOption } from "../../select-option";
import { expect, test } from "@playwright/test";
import { ports } from "../../../../playwright.config";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../helpers/locale";
import { enableStore, freshStockedProduct } from "../../store-fixtures";
import {
  startStripeStandIn,
  useStripeStandIn,
  type StandIn,
} from "../../stripe-stand-in";
import { updateIntegrationStatus } from "../../integrations";

const copy = t.orders;
const db = testDatabase();
const SKU = "E2E-PAYLINK";
let stripe: StandIn;
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  await useStripeStandIn(db);
  stripe = await startStripeStandIn(`http://localhost:${ports.web}`);
  await freshStockedProduct(db, {
    sku: SKU,
    nameEn: "E2E Pay Link Item",
    nameAr: "صنف رابط الدفع",
    price: 6,
    onHand: 5,
  });
});

test.afterAll(async () => {
  await stripe?.close();
  await db.storeSettings.update({
    where: { id: "default" },
    data: { paymentGateway: null },
  });
  await db.$disconnect();
});

test("a payment gateway is chosen in store settings", async ({ page }) => {
  const errors = watchErrors(page);
  await updateIntegrationStatus("stripe", { healthStatus: "healthy" });

  await page.goto("/dashboard/orders/settings");
  // In development a Fast Refresh can briefly mount the page twice; read one copy.
  const gateway = page.locator('select[name="paymentGateway"]').first();
  await expect(gateway).toHaveValue("stripe");
  await expect(gateway.locator('option[value="stripe"]')).toHaveText(
    `Stripe (${copy.settings.gatewayTest})`,
  );
  errors.assertClean();
});

test("a phone order is paid from a payment link and refunded through the gateway", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/orders/new");
  await expect(page.getByTestId("sale-search")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.getByTestId("sale-search").fill(SKU);
  await page.getByTestId("sale-search").press("Enter");
  await selectOption(page.getByLabel(copy.pos.channel), "phone");
  await page.locator('input[name="saleName"]').fill("Link Buyer");
  await selectOption(page.getByTestId("sale-paid-with"), "");
  await page.getByTestId("sale-create").click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });
  const id = page.url().split("/").pop()!;
  const link = await page
    .getByTestId("order-payment-link")
    .getByRole("textbox")
    .inputValue();
  expect(link).toMatch(
    new RegExp(`^http://localhost:${ports.web}/(ar|en)/pay/${id}\\.`),
  );

  // The customer opens the link.
  await page.goto(link);
  await page.waitForLoadState("networkidle");
  await page.getByTestId("pay-now").click();
  await page.waitForURL(`${stripe.url}/pay/**`, { timeout: 60_000 });
  await page.getByRole("link", { name: "Pay" }).click();
  await expect(page.getByTestId("order-placed")).toBeVisible({
    timeout: 60_000,
  });
  await expect
    .poll(
      async () =>
        (await db.salesOrder.findUniqueOrThrow({ where: { id } }))
          .paymentStatus,
    )
    .toBe("paid");

  await page.goto(`/dashboard/orders/${id}`);
  await expect(
    page.getByRole("main").getByTestId("order-attempts"),
  ).toContainText(copy.detail.attemptStatuses.paid);
  await expect(page.getByTestId("order-payment-link")).toHaveCount(0);
  await page.locator('input[name="refundAmount"]').fill("1");
  await page.getByTestId("order-refund").click();
  const confirmation = page
    .getByRole("dialog")
    .filter({ has: page.locator("[data-confirm-dialog]") });
  await expect(confirmation).toBeVisible();
  const orderNumber = (await db.salesOrder.findUniqueOrThrow({ where: { id } }))
    .number;
  await confirmation.getByRole("textbox").fill(orderNumber);
  await confirmation.getByRole("button").last().click();
  await expect(confirmation).toHaveCount(0);
  await expect
    .poll(async () =>
      Number(
        (await db.salesOrder.findUniqueOrThrow({ where: { id } }))
          .amountRefunded,
      ),
    )
    .toBe(1);
  const attempt = await db.paymentAttempt.findFirstOrThrow({
    where: { orderId: id, status: "paid" },
  });
  expect(Number(attempt.amountRefunded)).toBe(1);
  expect(stripe.refunds).toEqual([
    { payment_intent: attempt.gatewayPaymentId, amount: 1000 },
  ]);
  errors.assertClean();
});

test("a bank transfer is recorded on a phone order with the transfer receipt kept on the order", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/orders/new");
  await expect(page.getByTestId("sale-search")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.getByTestId("sale-search").fill(SKU);
  await page.getByTestId("sale-search").press("Enter");
  await selectOption(page.getByLabel(copy.pos.channel), "phone");
  await page.locator('input[name="saleName"]').fill("Transfer Buyer");
  await selectOption(page.getByTestId("sale-paid-with"), "");
  await page.getByTestId("sale-create").click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });
  const id = page.url().split("/").pop()!;
  await page.waitForLoadState("networkidle");
  const card = page.getByTestId("order-payment").first();
  const order = await db.salesOrder.findUniqueOrThrow({ where: { id } });
  await card
    .locator('input[name="paymentAmount"]')
    .fill(String(Number(order.total)));
  await selectOption(card.locator("select"), "bank_transfer");
  await card.locator('input[name="transferProof"]').setInputFiles({
    name: "transfer.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await expect(card.getByText(copy.detail.proofAdded).first()).toBeVisible();
  await card.getByTestId("order-pay").click();
  await expect
    .poll(
      async () =>
        (await db.salesOrder.findUniqueOrThrow({ where: { id } }))
          .paymentStatus,
    )
    .toBe("paid");
  await expect(page.getByTestId("order-files").first()).toContainText(
    "transfer.pdf",
  );
  expect(
    await db.attachment.count({
      where: { entityType: "sales_order", entityId: id },
    }),
  ).toBe(1);
  errors.assertClean();
});
