import { selectOption } from "../../select-option";
import { acceptConfirmations } from "../../helpers";
import crypto from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { en } from "../../../../packages/locales/src";
import users from "../../fixtures/users.json";
import { cronSecret, ports } from "../../../../playwright.config";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";
import { enableStore, freshStockedProduct } from "../../store-fixtures";

const db = testDatabase();
const web = `http://localhost:${ports.web}`;
const admin = `http://localhost:${ports.admin}`;
const UTM = "e2e-eid";
const BUYER = "e2e-marketing-buyer@example.test";
let productId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  require("dotenv").config({
    path: path.resolve(__dirname, "../../../../.env"),
    quiet: true,
  });
  await enableStore(db);
  for (const [moduleKey, nameEn, nameAr] of [
    ["marketing", "Marketing", "التسويق"],
    ["pr", "Public relations", "العلاقات العامة"],
    ["legal", "Legal", "الشؤون القانونية"],
  ]) {
    await db.featureToggle.upsert({
      where: { moduleKey },
      update: { isEnabled: true },
      create: { moduleKey, nameEn, nameAr, isEnabled: true },
    });
  }
  await db.abuseWindow.deleteMany({
    where: { key: { startsWith: "customer-" } },
  });
  await db.broadcast.deleteMany({ where: { name: "E2E news" } });
  await db.customerSegment.deleteMany({ where: { name: "E2E buyers" } });
  await db.campaign.deleteMany({ where: { utmCampaign: UTM } });
  await db.customer.deleteMany({ where: { email: BUYER } });
  await db.mediaCoverage.deleteMany({ where: { outlet: "E2E Daily" } });
  await db.legalMatter.deleteMany({ where: { title: { startsWith: "E2E " } } });
  await db.cmsArticle.deleteMany({ where: { slug: "e2e-press-release" } });
  productId = (
    await freshStockedProduct(db, {
      sku: "E2E-MKT",
      nameEn: "E2E Marketing Item",
      nameAr: "صنف التسويق",
      price: 20,
      onHand: 10,
    })
  ).id;
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("a campaign's tracked link brings an order that counts on the campaign", async ({
  page,
  browser,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/marketing");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("campaign-new").click();
  await page.locator('input[name="campaignName"]').fill("E2E Eid");
  await page.locator('input[name="campaignUtm"]').fill(UTM);
  await page.locator('input[name="campaignSpend"]').fill("10");
  await selectOption(page.locator('select[name="campaignStatus"]'), "running");
  await page.getByTestId("campaign-save").click();
  const card = page.getByTestId(`campaign-${UTM}`).first();
  await expect(card).toBeVisible();
  await card.locator("summary").click();
  await expect(card.getByTestId("tracked-link")).toHaveValue(
    new RegExp(`utm_campaign=${UTM}`),
  );

  // A shopper arrives from the link, signs up for news, and orders.
  const shopper = await browser.newContext({ baseURL: web });
  const visit = await shopper.newPage();
  await visit.goto(
    `/en?utm_campaign=${UTM}&utm_source=instagram&utm_medium=social`,
  );
  await expect
    .poll(async () =>
      (await shopper.cookies()).some((c) => c.name === "platform-utm"),
    )
    .toBe(true);
  const headers = { origin: web };
  expect(
    (
      await visit.request.post(`${web}/api/account/sign-up`, {
        headers,
        data: {
          name: "Marketing Buyer",
          email: BUYER,
          password: `e2e-${crypto.randomUUID()}`,
          locale: "en",
          marketingOptIn: true,
        },
      })
    ).ok(),
  ).toBe(true);
  const placed = await visit.request.post(`${web}/api/store/order`, {
    headers,
    data: {
      lines: [{ productId, quantity: 2 }],
      fulfilment: "pickup",
      name: "Marketing Buyer",
      email: BUYER,
      phone: "+973 3600 0011",
      paymentMethod: "cod",
      locale: "en",
    },
  });
  expect(placed.ok(), await placed.text()).toBe(true);
  await shopper.close();
  const order = await db.salesOrder.findFirstOrThrow({
    where: { email: BUYER },
    orderBy: { placedAt: "desc" },
  });
  expect(order).toMatchObject({
    utmCampaign: UTM,
    utmSource: "instagram",
    utmMedium: "social",
  });

  await page.reload();
  const results = page
    .getByTestId(`campaign-${UTM}`)
    .first()
    .getByTestId("campaign-results");
  await expect(results).toContainText(
    t.marketing.campaigns.orders.replace("{count}", "1"),
  );
  errors.assertClean();
});

test("a segment of buyers gets a broadcast; only those who agreed, and each can unsubscribe", async ({
  page,
  request,
}) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/marketing/audience");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("segment-new").click();
  await page.locator('input[name="segmentName"]').fill("E2E buyers");
  await page.locator('input[name="segment-minOrders"]').fill("1");
  await page.getByTestId("segment-save").click();
  await expect(page.getByTestId("segments-list")).toContainText("E2E buyers");

  await page.getByTestId("broadcast-new").click();
  const form = page.getByTestId("broadcast-form");
  await form.locator('input[name="broadcastName"]').fill("E2E news");
  await selectOption(form
    .locator('select[name="broadcastSegment"]'), { label: "E2E buyers" });
  for (const input of await form.locator("input:not([name])").all())
    await input.fill("Our Eid offers");
  for (const area of await form.locator("textarea").all())
    await area.fill("Twenty percent off this week.");
  await page.getByTestId("broadcast-save").click();
  await acceptConfirmations(page);
  await page
    .getByTestId("broadcast-E2E news")
    .getByTestId("broadcast-send")
    .click();
  await expect(page.getByRole("status")).toContainText(/\d+/);
  const broadcast = await db.broadcast.findFirstOrThrow({
    where: { name: "E2E news" },
    include: { recipients: true },
  });
  expect(broadcast.status).toBe("sending");
  const buyer = await db.customer.findUniqueOrThrow({
    where: { email: BUYER },
  });
  expect(broadcast.recipients.map((r) => r.customerId)).toContain(buyer.id);
  // Only customers who agreed to marketing e-mail are on it.
  const optedOut = await db.customer.count({
    where: {
      id: { in: broadcast.recipients.map((r) => r.customerId) },
      marketingOptIn: false,
    },
  });
  expect(optedOut).toBe(0);

  // The scheduled job sends in batches (no mail service in the test servers, so they are marked not sent).
  const cron = await request.get(`${admin}/api/cron`, {
    headers: { authorization: `Bearer ${cronSecret}` },
  });
  expect(cron.ok()).toBe(true);
  expect(
    (await db.broadcast.findUniqueOrThrow({ where: { id: broadcast.id } }))
      .status,
  ).toBe("sent");

  // The unsubscribe link in each e-mail.
  const secret =
    process.env.CUSTOMER_AUTH_SECRET || process.env.REVALIDATION_SECRET || "";
  const token = `${buyer.id}.${crypto.createHmac("sha256", secret).update(`unsubscribe:${buyer.id}`).digest("base64url").slice(0, 32)}`;
  const visitor = await page.context().newPage();
  await visitor.goto(`${web}/en/unsubscribe/${token}`);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    en.marketing.unsubscribedTitle,
  );
  expect(
    (await db.customer.findUniqueOrThrow({ where: { id: buyer.id } }))
      .marketingOptIn,
  ).toBe(false);
  await visitor.goto(`${web}/en/unsubscribe/${buyer.id}.forged`);
  await expect(
    visitor
      .getByRole("alert")
      .filter({ hasText: en.marketing.unsubscribeInvalid }),
  ).toBeVisible();
  await visitor.close();
  errors.assertClean();
});

test("press releases, coverage and the website's press page", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await db.cmsArticle.create({
    data: {
      slug: "e2e-press-release",
      titleEn: "E2E opens a new branch",
      titleAr: "افتتاح فرع جديد",
      category: "press_release",
      status: "published",
      publishAt: new Date(Date.now() - 60_000),
    },
  });
  await page.goto("/dashboard/press");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("link", { name: "افتتاح فرع جديد" }).first(),
  ).toBeVisible();
  await page.getByTestId("coverage-new").click();
  await page
    .locator('input[name="coverageTitle"]')
    .fill("New branch opens downtown");
  await page.locator('input[name="coverageOutlet"]').fill("E2E Daily");
  await page.locator('input[name="coverageReach"]').fill("12000");
  await selectOption(page
    .locator('select[name="coverageSentiment"]'), "positive");
  await page.getByTestId("coverage-save").click();
  await expect(page.getByTestId("coverage-list")).toContainText("E2E Daily");
  await expect(page.getByTestId("press-summary")).toContainText("12,000");

  const site = await page.context().newPage();
  await site.goto(`${web}/en/press`);
  await expect(site.getByTestId("press-releases")).toContainText(
    "E2E opens a new branch",
  );
  await site.close();
  errors.assertClean();
});

test("a legal matter keeps its history, reminds its counsel before the hearing, and closes with an outcome", async ({
  page,
  request,
}) => {
  const errors = watchErrors(page);
  const me = await db.user.findUniqueOrThrow({
    where: { email: users.admin.email },
  });
  const hearing = new Date(Date.now() + 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await page.goto("/dashboard/legal");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("legal-new").click();
  await page
    .locator('input[name="matterTitle"]')
    .fill("E2E unpaid invoice claim");
  await selectOption(page.locator('select[name="matterKind"]'), "claim");
  await page.locator('input[name="matterCounterparty"]').fill("Late Payer Co.");
  await page.locator('input[name="matterNextDate"]').fill(hearing);
  await selectOption(page.locator('select[name="matterAssignee"]'), me.id);
  await page.getByTestId("legal-save").click();
  await expect(page).toHaveURL(/\/dashboard\/legal\/[0-9a-f-]{36}$/, {
    timeout: 60_000,
  });
  const id = page.url().split("/").pop()!;

  await page
    .locator('textarea[name="legalNote"]')
    .fill("Sent a final demand letter.");
  await page.getByTestId("legal-note-add").click();
  await expect(page.getByTestId("legal-history")).toContainText(
    "Sent a final demand letter.",
  );

  expect(
    (
      await request.get(`${admin}/api/cron`, {
        headers: { authorization: `Bearer ${cronSecret}` },
      })
    ).ok(),
  ).toBe(true);
  expect(
    await db.notification.count({
      where: { userId: me.id, entityType: "legal_matter", entityId: id },
    }),
  ).toBe(1);
  // Once per date.
  await request.get(`${admin}/api/cron`, {
    headers: { authorization: `Bearer ${cronSecret}` },
  });
  expect(
    await db.notification.count({
      where: { userId: me.id, entityType: "legal_matter", entityId: id },
    }),
  ).toBe(1);

  await page.getByTestId("legal-edit").click();
  await selectOption(page.locator('select[name="matterStatus"]'), "closed");
  await page.locator('textarea[name="matterOutcome"]').fill("Paid in full.");
  await page.getByTestId("legal-save").click();
  await expect(page.getByTestId("legal-status")).toHaveText(
    t.legal.statuses.closed,
  );
  const matter = await db.legalMatter.findUniqueOrThrow({ where: { id } });
  expect(matter.closedAt).not.toBeNull();
  expect(matter.outcome).toBe("Paid in full.");
  errors.assertClean();
});
