import { expect, test } from "@playwright/test";
import en from "../../../../packages/locales/src/en.json";
import { cronSecret, ports } from "../../../../playwright.config";
import { testDatabase, watchErrors } from "../../helpers";
import { enableStore, freshStockedProduct, stockOf } from "../../store-fixtures";
import { startStripeStandIn, useStripeStandIn, type StandIn } from "../../stripe-stand-in";

const copy = en.store;
const db = testDatabase();
const web = `http://localhost:${ports.web}`;
let productId = "";
let itemPath = "";
let stripe: StandIn;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  await useStripeStandIn(db);
  stripe = await startStripeStandIn(web);
  // The second catalogue item, so the cart spec keeps the first.
  const item = (await db.portfolioItem.findMany({ orderBy: { displayOrder: "asc" }, take: 2 }))[1];
  const content = await db.websiteContent.findUniqueOrThrow({ where: { id: "main" } });
  const slug = (content.published as { config?: { collection?: { slug?: string } } } | null)?.config?.collection?.slug ?? "works";
  itemPath = `/en/${slug}/${item.slug}`;
  productId = (await freshStockedProduct(db, { sku: "E2E-ONLINE", nameEn: "E2E Online Item", nameAr: "صنف الدفع الإلكتروني", price: 7.25, onHand: 5, catalogueItemId: item.id })).id;
});

test.afterAll(async () => {
  await stripe?.close();
  await db.storeSettings.update({ where: { id: "default" }, data: { paymentGateway: null } });
  await db.$disconnect();
});

async function checkoutOnline(page: import("@playwright/test").Page) {
  await page.goto(itemPath);
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-to-cart-button").click();
  await expect(page.getByRole("link", { name: copy.viewCart })).toBeVisible();
  await page.goto("/en/checkout");
  await page.waitForLoadState("networkidle");
  const form = page.getByTestId("checkout-form");
  await form.locator('input[name="name"]').fill("Online Buyer");
  await form.locator('input[name="email"]').fill("e2e-online-buyer@example.test");
  await form.locator('input[name="phone"]').fill("+973 3600 0005");
  await form.getByText(copy.fulfilments.pickup).click();
  await expect(form.getByRole("radio", { name: copy.paymentMethods.online })).toBeChecked();
  await page.getByTestId("checkout-place").click();
  // Straight on to the gateway's page.
  await page.waitForURL(`${stripe.url}/pay/**`, { timeout: 60_000 });
  await expect(page.getByTestId("standin-amount")).toHaveText(/^\d+ [a-z]{3}$/);
}

const orderFor = () => db.salesOrder.findFirstOrThrow({ where: { lines: { some: { productId } } }, orderBy: { placedAt: "desc" }, include: { paymentAttempts: true } });

test("paying online: the gateway's signed webhook and the customer's return record the payment once", async ({ page, request }) => {
  const errors = watchErrors(page);
  await checkoutOnline(page);
  const placed = await orderFor();
  expect(placed.paymentStatus).toBe("pending");
  expect(await stockOf(db, productId)).toEqual({ onHand: 5, reserved: 1 });

  await page.getByRole("link", { name: "Pay" }).click();
  await expect(page.getByTestId("order-placed")).toContainText(placed.number, { timeout: 60_000 });
  const order = await orderFor();
  expect(order.paymentStatus).toBe("paid");
  expect(order.status).toBe("paid");
  expect(order.paymentAttempts).toHaveLength(1);
  expect(order.paymentAttempts[0]).toMatchObject({ gateway: "stripe", status: "paid", testMode: true });
  const receipts = () => db.payment.count({ where: { invoiceId: order.invoiceId!, paymentMethod: "online" } });
  expect(await receipts()).toBe(1);

  // Stripe retries a webhook it thinks failed: nothing changes.
  const replay = await request.post(`${web}/api/store/payment/webhook/stripe`, { headers: { "Content-Type": "application/json", "Stripe-Signature": stripe.sign(stripe.lastWebhook!.body) }, data: stripe.lastWebhook!.body });
  expect(replay.ok()).toBe(true);
  expect(await receipts()).toBe(1);
  // A forged one is refused.
  const forged = await request.post(`${web}/api/store/payment/webhook/stripe`, { headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=00" }, data: stripe.lastWebhook!.body });
  expect(forged.status()).toBe(401);
  errors.assertClean();
});

test("leaving the gateway without paying keeps the order, and the customer can try again", async ({ page }) => {
  const errors = watchErrors(page);
  await checkoutOnline(page);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page.getByTestId("pay-state")).toContainText(copy.payFailedTitle, { timeout: 60_000 });
  let order = await orderFor();
  expect(order.paymentAttempts.map((a) => a.status)).toEqual(["failed"]);
  expect(order.status).toBe("placed");

  // The page arrived by redirect from the gateway; let it finish loading before using its button.
  await page.waitForLoadState("networkidle");
  await page.getByTestId("pay-now").click();
  await page.waitForURL(`${stripe.url}/pay/**`);
  await page.getByRole("link", { name: "Pay" }).click();
  await expect(page.getByTestId("order-placed")).toContainText(order.number, { timeout: 60_000 });
  order = await orderFor();
  expect(order.paymentStatus).toBe("paid");
  expect(order.paymentAttempts.map((a) => a.status).sort()).toEqual(["failed", "paid"]);
  errors.assertClean();
});

test("an online order nobody pays for is cancelled by the scheduled job and its stock is released", async ({ page, request }) => {
  await checkoutOnline(page);
  const placed = await orderFor();
  // Paid orders from the tests above still hold their items until shipped.
  const before = await stockOf(db, productId);
  // Two hours ago, past the timeout and the grace period for payments still at the gateway.
  await db.paymentAttempt.updateMany({ where: { orderId: placed.id }, data: { createdAt: new Date(Date.now() - 2 * 3600_000 - 60_000) } });
  const cron = await request.get(`http://localhost:${ports.admin}/api/cron`, { headers: { authorization: `Bearer ${cronSecret}` } });
  expect(cron.status(), await cron.text()).toBe(200);
  expect((await cron.json()).onlinePayments).toMatchObject({ expired: 1, cancelled: 1 });
  const order = await orderFor();
  expect(order.status).toBe("cancelled");
  expect(order.paymentAttempts.map((a) => a.status)).toEqual(["expired"]);
  expect(await stockOf(db, productId)).toEqual({ onHand: before.onHand, reserved: before.reserved - 1 });
});
