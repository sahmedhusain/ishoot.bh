import { expect, test } from "@playwright/test";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";

const copy = t.procurement;
const db = testDatabase();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const moduleKey of ["products", "procurement"])
    await db.featureToggle.upsert({ where: { moduleKey }, update: { isEnabled: true }, create: { moduleKey, nameEn: moduleKey, nameAr: moduleKey, isEnabled: true } });
  // Earlier runs' documents and suppliers.
  const suppliers = await db.crmContact.findMany({ where: { companyName: { startsWith: "E2E Supplier" } }, select: { id: true } });
  const ids = suppliers.map((s) => s.id);
  await db.emailJob.deleteMany({ where: { eventKey: { startsWith: "purchase_order:" } } });
  await db.purchaseOrder.deleteMany({ where: { supplierId: { in: ids } } });
  await db.rfqQuote.deleteMany({ where: { supplierId: { in: ids } } });
  await db.crmContact.deleteMany({ where: { id: { in: ids } } });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("a requisition is approved, priced by two suppliers, ordered from the cheaper one and emailed", async ({ page }) => {
  const errors = watchErrors(page);

  for (const [name, email] of [["E2E Supplier Alpha", "alpha@supplier.example"], ["E2E Supplier Beta", "beta@supplier.example"]]) {
    await page.goto("/dashboard/procurement/suppliers");
    await page.getByRole("button", { name: copy.suppliers.add }).click();
    await page.locator('input[name="supplier-companyName"]').fill(name);
    await page.locator('input[name="supplier-email"]').fill(email);
    await page.locator('input[name="supplier-phone"]').fill("+973 3600 0001");
    await page.getByTestId("supplier-save").click();
    await expect(page.getByText(name)).toBeVisible();
  }

  await page.goto("/dashboard/procurement/requisitions/new");
  await page.getByRole("textbox", { name: copy.lines.description }).fill("E2E office chairs");
  await page.getByRole("spinbutton", { name: `${copy.lines.quantity} 1` }).fill("5");
  await page.getByRole("spinbutton", { name: `${copy.lines.estimatedCost} 1` }).fill("20");
  await page.getByTestId("requisition-submit").click();
  await expect(page).toHaveURL(/\/dashboard\/procurement\/requisitions\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  // The administrator's own requisition needs nobody else's approval.
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.approved);

  await page.getByTestId("requisition-rfq").click();
  await expect(page).toHaveURL(/\/dashboard\/procurement\/rfqs\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  for (const [name, price] of [["E2E Supplier Alpha", "18.5"], ["E2E Supplier Beta", "17.25"]]) {
    await page.getByTestId("rfq-add-quote").click();
    const entry = page.getByTestId("rfq-quote-entry");
    await entry.getByLabel(copy.rfqs.supplier).selectOption({ label: name });
    await entry.getByRole("spinbutton", { name: new RegExp(`^${copy.lines.unitPrice}`) }).fill(price);
    await page.getByTestId("rfq-quote-save").click();
    await expect(page.getByTestId("rfq-quote-entry")).toHaveCount(0);
  }
  const compare = page.getByTestId("rfq-compare");
  await expect(compare.getByText(copy.rfqs.best)).toHaveCount(1);
  // The cheaper price is chosen already.
  await expect(compare.getByRole("radio", { name: new RegExp("E2E Supplier Beta") })).toBeChecked();
  await page.getByTestId("rfq-award").click();
  await expect(page.getByRole("status")).toHaveText(copy.rfqs.awarded);

  const order = await db.purchaseOrder.findFirstOrThrow({ where: { supplier: { companyName: "E2E Supplier Beta" } }, include: { lines: true } });
  expect(Number(order.lines[0].unitPrice)).toBe(17.25);
  await page.goto(`/dashboard/procurement/orders/${order.id}`);
  await page.getByTestId("order-submit").click();
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.approved);
  await page.getByTestId("order-email").click();
  await expect(page.getByRole("status")).toHaveText(copy.orders.emailQueued.replace("{email}", "beta@supplier.example"));
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.sent);
  const job = await db.emailJob.findFirst({ where: { eventKey: { startsWith: `purchase_order:${order.id}` } } });
  expect(job?.recipient).toBe("beta@supplier.example");
  expect(job?.attachment.subarray(0, 4).toString()).toBe("%PDF");

  const pdf = await page.request.get(`/api/procurement/orders/${order.id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  errors.assertClean();
});
