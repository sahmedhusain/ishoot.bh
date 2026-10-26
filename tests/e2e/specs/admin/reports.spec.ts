import { expect, test } from "@playwright/test";
import users from "../../fixtures/users.json";
import { cronSecret, ports } from "../../../../playwright.config";
import { login, testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";
import { enableDelivery, enableStore, freshStockedProduct, disableDelivery } from "../../store-fixtures";

const copy = t.reports;
const db = testDatabase();
const web = `http://localhost:${ports.web}`;
const admin = `http://localhost:${ports.admin}`;
const today = new Date().toISOString().slice(0, 10);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await enableStore(db);
  await enableDelivery(db);
  const product = await freshStockedProduct(db, { sku: "E2E-REPORT", nameEn: "E2E Report Item", nameAr: "صنف التقارير", price: 15, onHand: 20 });
  // An order today, so sales reports have something to show.
  const response = await fetch(`${web}/api/store/order`, { method: "POST", headers: { "Content-Type": "application/json", origin: web }, body: JSON.stringify({ lines: [{ productId: product.id, quantity: 2 }], fulfilment: "pickup", name: "Report Buyer", email: "e2e-report-buyer@example.test", phone: "+973 3600 0012", paymentMethod: "cod", locale: "en" }) });
  expect(response.ok).toBe(true);
  const me = await db.user.findUniqueOrThrow({ where: { email: users.admin.email } });
  await db.reportSchedule.deleteMany({ where: { ownerId: me.id } });
});

test.afterAll(async () => {
  await disableDelivery(db);
  await db.$disconnect();
});

test("reports open for the period with the period before, and export as CSV, Excel and PDF", async ({ page, request }) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/reports");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("report-sales_by_product")).toBeVisible();
  await page.getByTestId("report-sales_by_product").click();
  await expect(page).toHaveURL(/\/dashboard\/reports\/sales_by_product/);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("report-table")).toContainText("صنف التقارير");
  await page.getByTestId("report-compare").click();
  await expect(page).toHaveURL(/compare=1/);
  await expect(page.getByTestId("report-previous")).toBeVisible();
  await expect(page.getByTestId("report-chart")).toBeVisible();

  const base = `${admin}/api/reports/sales_by_product?from=${today.slice(0, 8)}01&to=${today}`;
  const csv = await request.get(`${base}&format=csv&locale=en`);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("E2E Report Item");
  const xlsx = await request.get(`${base}&format=xlsx`);
  expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
  expect((await xlsx.body()).subarray(0, 2).toString()).toBe("PK");
  const pdf = await request.get(`${base}&format=pdf`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  errors.assertClean();
});

test("a report scheduled by e-mail is run by the scheduled job", async ({ page, request }) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/reports/stock_on_hand");
  await page.waitForLoadState("networkidle");
  await page.locator('select[name="scheduleFrequency"]').selectOption("daily");
  await page.locator('input[name="scheduleRecipients"]').fill("e2e-reports@example.test, e2e-owner@example.test");
  await page.getByTestId("schedule-add").click();
  await expect(page.getByTestId("report-schedules")).toContainText("e2e-reports@example.test");
  const schedule = await db.reportSchedule.findFirstOrThrow({ where: { reportKey: "stock_on_hand", isActive: true }, orderBy: { createdAt: "desc" } });
  expect(schedule.recipients).toEqual(["e2e-reports@example.test", "e2e-owner@example.test"]);
  // Make it due now; with no mail service in the test servers it is attempted and noted as not sent.
  await db.reportSchedule.update({ where: { id: schedule.id }, data: { nextRunAt: new Date(Date.now() - 60_000) } });
  expect((await request.get(`${admin}/api/cron`, { headers: { authorization: `Bearer ${cronSecret}` } })).ok()).toBe(true);
  const after = await db.reportSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  expect(after.nextRunAt.getTime()).toBeGreaterThan(Date.now());
  expect(after.lastError).toBe("not_sent");
  errors.assertClean();
});

test("a driver sees only the reports their role allows", async ({ browser, request }) => {
  const context = await browser.newContext({ baseURL: admin });
  const page = await context.newPage();
  await login(page, users.driver.email, users.driver.password);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  await page.goto("/dashboard/reports");
  await expect(page.getByTestId("report-delivery_performance")).toBeVisible();
  await expect(page.getByTestId("report-sales_by_product")).toHaveCount(0);
  const refused = await page.request.get(`${admin}/api/reports/sales_by_product?format=csv`);
  expect(refused.status()).toBe(403);
  await context.close();
  expect(request).toBeTruthy();
  void copy;
});
