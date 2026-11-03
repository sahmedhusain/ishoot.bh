import { selectOption } from "../../select-option";
import crypto from "node:crypto";
import { expect, test } from "@playwright/test";
import { en } from "../../locales";
import { ports } from "../../../../playwright.config";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";
import { enableStore, freshStockedProduct } from "../../store-fixtures";

const copy = t.serviceDesk;
const db = testDatabase();
const web = `http://localhost:${ports.web}`;
const EMAIL = "e2e-help-customer@example.test";
let productId = "";
let orderId = "";
let requestId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  await db.abuseWindow.deleteMany({
    where: { key: { startsWith: "customer-" } },
  });
  const old = await db.customer.findMany({
    where: { email: EMAIL },
    select: { id: true },
  });
  await db.inquiry.deleteMany({ where: { emailNorm: EMAIL } });
  await db.customer.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await db.cannedReply.deleteMany({ where: { title: "E2E thanks" } });
  await db.serviceSettings.upsert({
    where: { id: "default" },
    update: { slaUrgentHours: 4, slaHighHours: 24, slaNormalHours: 72 },
    create: { id: "default" },
  });
  productId = (
    await freshStockedProduct(db, {
      sku: "E2E-HELP",
      nameEn: "E2E Help Item",
      nameAr: "صنف المساعدة",
      price: 3,
      onHand: 5,
    })
  ).id;
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("a customer reports a problem with an order from their account; it reaches the desk linked, prioritised and due", async ({
  browser,
}) => {
  const context = await browser.newContext({ baseURL: web });
  const page = await context.newPage();
  const errors = watchErrors(page);
  const headers = { origin: web };
  expect(
    (
      await page.request.post(`${web}/api/account/sign-up`, {
        headers,
        data: {
          name: "Help Customer",
          email: EMAIL,
          password: `e2e-${crypto.randomUUID()}`,
          locale: "en",
        },
      })
    ).ok(),
  ).toBe(true);
  const placed = await page.request.post(`${web}/api/store/order`, {
    headers,
    data: {
      lines: [{ productId, quantity: 1 }],
      fulfilment: "pickup",
      name: "Help Customer",
      email: EMAIL,
      phone: "+973 3600 0010",
      paymentMethod: "cod",
      locale: "en",
    },
  });
  expect(placed.ok(), await placed.text()).toBe(true);
  const order = await db.salesOrder.findFirstOrThrow({
    where: { email: EMAIL },
    orderBy: { placedAt: "desc" },
  });
  orderId = order.id;

  await page.goto("/en/account");
  const row = page.getByTestId(`account-order-${order.number}`);
  await row.getByTestId("order-help-open").click();
  await row.getByText(en.account.help.problem).click();
  await row
    .locator('textarea[name="helpMessage"]')
    .fill("The box arrived damaged.");
  const before = Date.now();
  await row.getByTestId("order-help-send").click();
  await expect(row.getByRole("status")).toContainText(/CMP-\d{4}-\d{6}/);

  const request = await db.inquiry.findFirstOrThrow({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  requestId = request.id;
  expect(request).toMatchObject({
    intent: "complaint",
    priority: "high",
    emailNorm: EMAIL,
  });
  // Due a day later (the high-priority resolution time).
  const due = request.slaDueDate!.getTime() - before;
  expect(due).toBeGreaterThan(23.9 * 3_600_000);
  expect(due).toBeLessThan(24.2 * 3_600_000);
  errors.assertClean();
  await context.close();
});

test("staff save a reply and send email and WhatsApp through notify from the request", async ({
  page,
  context,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/requests/settings");
  // A page's first compile in development can briefly mount it twice; act once it has settled.
  await page.waitForLoadState("networkidle");
  await page.getByTestId("canned-new").click();
  await page.locator('input[name="cannedTitle"]').fill("E2E thanks");
  const editor = page.getByTestId("canned-editor");
  const bodies = editor.locator("textarea");
  for (let i = 0; i < (await bodies.count()); i++)
    await bodies.nth(i).fill("Thank you, a replacement is on its way.");
  await page.getByTestId("canned-save").click();
  await expect(page.getByTestId("canned-list")).toContainText("E2E thanks");

  await page.goto(`/dashboard/requests/${requestId}`);
  await page.waitForLoadState("networkidle");
  const panel = page.getByTestId("service-reply");
  await expect(panel.getByTestId("request-order")).toHaveAttribute(
    "href",
    `/dashboard/orders/${orderId}`,
  );
  await selectOption(panel.getByTestId("canned-pick"), { label: "E2E thanks" });
  await expect(panel.locator('textarea[name="serviceReply"]')).toHaveValue(
    "Thank you, a replacement is on its way.",
  );

  errors.assertClean();
  // Notify owns delivery; the isolated stack sends this reply to Mailpit.
  const inboxUrl = `http://127.0.0.1:${process.env.MAILPIT_UI_PORT || 8025}/api/v1/messages?limit=200`;
  const inbox = await page.request.get(inboxUrl);
  expect(inbox.ok()).toBe(true);
  const deliveredBefore = new Set(
    (await inbox.json()).messages.map((mail: { ID: string }) => mail.ID),
  );
  await panel.getByTestId("reply-email").click();
  await expect(panel.getByRole("status")).toHaveText(copy.reply.sent);
  await expect
    .poll(() =>
      db.requestComment.count({
        where: {
          inquiryId: requestId,
          isClientVisible: true,
          channel: "email",
        },
      }),
    )
    .toBe(1);
  const { reference } = await db.inquiry.findUniqueOrThrow({
    where: { id: requestId },
  });
  await expect
    .poll(async () => {
      const response = await page.request.get(inboxUrl);
      expect(response.ok()).toBe(true);
      const { messages } = await response.json();
      return messages.some(
        (mail: {
          ID: string;
          Subject: string;
          To: Array<{ Address: string }>;
        }) =>
          !deliveredBefore.has(mail.ID) &&
          mail.Subject.includes(reference) &&
          mail.To.some((to) => to.Address === EMAIL),
      );
    })
    .toBe(true);
  errors.assertClean();

  const later = watchErrors(page);
  await selectOption(panel.getByTestId("canned-pick"), { label: "E2E thanks" });
  // The isolated stack sends WhatsApp through its sandbox. Unexpected chat links stay local too.
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>chat</title>",
    }),
  );
  const sandboxUrl = `http://127.0.0.1:${process.env.WHATSAPP_SANDBOX_PORT || 8095}/sandbox/messages?to=97336000010`;
  const sandbox = await page.request.get(sandboxUrl);
  expect(sandbox.ok()).toBe(true);
  const sentBefore = new Set(
    (await sandbox.json()).items.map((item: { id: string }) => item.id),
  );
  await panel.getByTestId("reply-whatsapp").click();
  await expect(panel.getByRole("status")).toHaveText(copy.reply.sent);
  await expect
    .poll(async () => {
      const response = await page.request.get(sandboxUrl);
      expect(response.ok()).toBe(true);
      const { items } = await response.json();
      return items.some(
        (item: { id: string; to: string }) =>
          !sentBefore.has(item.id) && item.to === "97336000010",
      );
    })
    .toBe(true);
  expect(context.pages()).toHaveLength(1);
  await expect(panel.getByTestId("service-replies")).toContainText(
    "a replacement is on its way",
  );
  const reply = await db.requestComment.findFirstOrThrow({
    where: { inquiryId: requestId, isClientVisible: true, channel: "whatsapp" },
  });
  expect(reply.channel).toBe("whatsapp");
  expect(
    (await db.inquiry.findUniqueOrThrow({ where: { id: requestId } }))
      .workflowStatus,
  ).toBe("under_review");

  // The order shows the request.
  await page.goto(`/dashboard/orders/${orderId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("order-requests").first()).toContainText(
    /CMP-\d{4}-\d{6}/,
  );
  later.assertClean();
});
