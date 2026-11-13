import { selectOption } from "./helpers/select-option";
import { expect, test } from "@playwright/test";
import { testDatabase, watchErrors } from "./helpers/helpers";
import { t } from "./helpers/locale";
import { setModule } from "./helpers/modules";

const copy = t.procurement;
const db = testDatabase();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const moduleKey of ["products", "procurement"])
    await setModule(moduleKey, true);
  const suppliers = await db.crmContact.findMany({
    where: { companyName: { startsWith: "E2E Supplier" } },
    select: { id: true },
  });
  const ids = suppliers.map((s) => s.id);
  const bills = await db.supplierBill.findMany({
    where: { supplierId: { in: ids } },
    select: { id: true, expenseId: true },
  });
  await db.supplierBill.deleteMany({
    where: { id: { in: bills.map((b) => b.id) } },
  });
  await db.expense.deleteMany({
    where: {
      id: { in: bills.map((b) => b.expenseId).filter((v): v is string => !!v) },
    },
  });
  await db.goodsReceipt.deleteMany({
    where: { purchaseOrder: { supplierId: { in: ids } } },
  });
  await db.emailJob.deleteMany({
    where: { eventKey: { startsWith: "purchase_order:" } },
  });
  await db.purchaseOrder.deleteMany({ where: { supplierId: { in: ids } } });
  await db.rfqQuote.deleteMany({ where: { supplierId: { in: ids } } });
  await db.crmContact.deleteMany({ where: { id: { in: ids } } });
  const old = await db.product.findUnique({ where: { sku: "E2E-PROC" } });
  if (old) {
    await db.stockMovement.deleteMany({ where: { productId: old.id } });
    await db.stockLevel.deleteMany({ where: { productId: old.id } });
    await db.stockItem.deleteMany({ where: { productId: old.id } });
    await db.product.delete({ where: { id: old.id } });
  }
  await db.product.create({
    data: {
      sku: "E2E-PROC",
      nameEn: "E2E Purchased Item",
      nameAr: "صنف مشتريات الاختبار",
      price: 5,
      cost: 2,
    },
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("requisition retries reuse the saved draft after submission fails", async ({
  page,
}) => {
  const description = `E2E retry requisition ${Date.now()}`;
  const path = "/dashboard/procurement/requisitions/new";
  await page.goto(path);
  await page
    .getByRole("textbox", { name: copy.lines.description })
    .fill(description);
  await page
    .getByRole("spinbutton", { name: `${copy.lines.quantity} 1` })
    .fill("1");
  await page
    .getByRole("spinbutton", { name: `${copy.lines.estimatedCost} 1` })
    .fill("20");
  await page.route(`**${path}`, (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const first = JSON.parse(route.request().postData() || "[]")[0];
    return typeof first === "string"
      ? route.fulfill({
          status: 500,
          contentType: "text/plain",
          body: "Test submission failure",
        })
      : route.continue();
  });
  await page.getByTestId("requisition-submit").click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/requisitions\/new$/);
  const where = { lines: { some: { description } } };
  const drafts = await db.purchaseRequisition.findMany({ where });
  expect(drafts).toHaveLength(1);
  expect(drafts[0].status).toBe("draft");
  await page.unroute(`**${path}`);
  await page.getByTestId("requisition-submit").click();
  await expect(page).toHaveURL(new RegExp(`/requisitions/${drafts[0].id}$`));
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.approved,
  );
  expect(await db.purchaseRequisition.count({ where })).toBe(1);
});

test("a requisition is approved, priced by two suppliers, ordered from the cheaper one and emailed", async ({
  page,
}) => {
  const errors = watchErrors(page);

  for (const [name, email] of [
    ["E2E Supplier Alpha", "alpha@supplier.example"],
    ["E2E Supplier Beta", "beta@supplier.example"],
  ]) {
    await page.goto("/dashboard/procurement/suppliers");
    await page.getByRole("button", { name: copy.suppliers.add }).click();
    await page.locator('input[name="supplier-companyName"]').fill(name);
    await page.locator('input[name="supplier-email"]').fill(email);
    await page
      .getByTestId("supplier-editor")
      .getByLabel(copy.suppliers.phone, { exact: true })
      .fill("+973 3600 0001");
    await page.getByTestId("supplier-save").click();
    await expect(page.getByText(name)).toBeVisible();
  }

  await page.goto("/dashboard/procurement/requisitions/new");
  await page
    .getByRole("textbox", { name: copy.lines.description })
    .fill("E2E office chairs");
  await page
    .getByRole("spinbutton", { name: `${copy.lines.quantity} 1` })
    .fill("5");
  await page
    .getByRole("spinbutton", { name: `${copy.lines.estimatedCost} 1` })
    .fill("20");
  await page.getByTestId("requisition-submit").click();
  await expect(page).toHaveURL(
    /\/dashboard\/procurement\/requisitions\/[0-9a-f-]{36}$/,
    { timeout: 60_000 },
  );
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.approved,
  );

  await page.getByTestId("requisition-rfq").click();
  await expect(page).toHaveURL(
    /\/dashboard\/procurement\/rfqs\/[0-9a-f-]{36}$/,
    { timeout: 60_000 },
  );
  for (const [name, price] of [
    ["E2E Supplier Alpha", "18.5"],
    ["E2E Supplier Beta", "17.25"],
  ]) {
    await page.getByTestId("rfq-add-quote").click();
    const entry = page.getByTestId("rfq-quote-entry");
    await selectOption(entry.getByLabel(copy.rfqs.supplier), { label: name });
    await entry
      .getByRole("spinbutton", { name: new RegExp(`^${copy.lines.unitPrice}`) })
      .fill(price);
    await page.getByTestId("rfq-quote-save").click();
    await expect(page.getByTestId("rfq-quote-entry")).toHaveCount(0);
  }
  const compare = page.getByTestId("rfq-compare");
  await expect(compare.getByText(copy.rfqs.best)).toHaveCount(1);
  await expect(
    compare.getByRole("radio", { name: new RegExp("E2E Supplier Beta") }),
  ).toBeChecked();
  await page.getByTestId("rfq-award").click();
  await expect(page.getByRole("status")).toHaveText(copy.rfqs.awarded);

  const order = await db.purchaseOrder.findFirstOrThrow({
    where: { supplier: { companyName: "E2E Supplier Beta" } },
    include: { lines: true },
  });
  expect(Number(order.lines[0].unitPrice)).toBe(17.25);
  await page.goto(`/dashboard/procurement/orders/${order.id}`);
  await page.getByRole("main").getByTestId("order-submit").click();
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.approved,
  );
  await page.getByTestId("order-email").click();
  await expect(page.getByRole("status")).toHaveText(
    copy.orders.emailQueued.replace("{email}", "beta@supplier.example"),
  );
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.sent,
  );
  const job = await db.emailJob.findFirst({
    where: { eventKey: { startsWith: `purchase_order:${order.id}` } },
  });
  expect(job?.recipient).toBe("beta@supplier.example");
  expect(job?.attachment.subarray(0, 4).toString()).toBe("%PDF");

  const pdf = await page.request.get(`/api/procurement/orders/${order.id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  errors.assertClean();
});

test("purchase order retries reuse the saved draft after submission fails", async ({
  page,
}) => {
  const description = `E2E retry order ${Date.now()}`;
  const path = "/dashboard/procurement/orders/new";
  await page.goto(path);
  await selectOption(page.getByLabel(copy.orders.supplier), {
    label: "E2E Supplier Alpha",
  });
  await page
    .getByRole("textbox", { name: copy.lines.description })
    .fill(description);
  await page
    .getByRole("spinbutton", { name: `${copy.lines.quantity} 1` })
    .fill("1");
  await page
    .getByRole("spinbutton", { name: `${copy.lines.unitPrice} 1` })
    .fill("20");
  await page.route(`**${path}`, (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const first = JSON.parse(route.request().postData() || "[]")[0];
    return typeof first === "string"
      ? route.fulfill({
          status: 500,
          contentType: "text/plain",
          body: "Test submission failure",
        })
      : route.continue();
  });
  await page.getByRole("main").getByTestId("order-submit").click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/orders\/new$/);
  const where = { lines: { some: { description } } };
  const drafts = await db.purchaseOrder.findMany({ where });
  expect(drafts).toHaveLength(1);
  expect(drafts[0].status).toBe("draft");
  await page.unroute(`**${path}`);
  await page.getByRole("main").getByTestId("order-submit").click();
  await expect(page).toHaveURL(new RegExp(`/orders/${drafts[0].id}$`));
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.approved,
  );
  expect(await db.purchaseOrder.count({ where })).toBe(1);
});

test("goods are received into stock, a bill that differs is approved with a reason, then paid", async ({
  page,
}) => {
  const errors = watchErrors(page);
  const product = await db.product.findUniqueOrThrow({
    where: { sku: "E2E-PROC" },
  });
  await page.goto("/dashboard/procurement/orders/new");
  await selectOption(page.getByLabel(copy.orders.supplier), {
    label: "E2E Supplier Alpha",
  });
  await selectOption(page.getByRole("combobox", { name: copy.lines.product }), {
    value: product.id,
  });
  await page
    .getByRole("spinbutton", { name: `${copy.lines.quantity} 1` })
    .fill("10");
  await page
    .getByRole("spinbutton", { name: `${copy.lines.unitPrice} 1` })
    .fill("2");
  await page.getByRole("main").getByTestId("order-submit").click();
  await expect(page).toHaveURL(
    /\/dashboard\/procurement\/orders\/[0-9a-f-]{36}$/,
    { timeout: 60_000 },
  );
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.approved,
  );

  const receive = page.getByTestId("receive-goods");
  await receive
    .getByRole("spinbutton", { name: new RegExp(`^${copy.receive.accepted}`) })
    .fill("6");
  await receive
    .getByRole("spinbutton", { name: new RegExp(`^${copy.receive.rejected}`) })
    .fill("1");
  await page.getByTestId("receive-save").click();
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.partially_received,
  );
  const level = await db.stockLevel.aggregate({
    where: { productId: product.id },
    _sum: { onHand: true },
  });
  expect(Number(level._sum.onHand)).toBe(6);
  const line = await db.purchaseOrderLine.findFirstOrThrow({
    where: { productId: product.id },
  });
  expect([
    Number(line.receivedQuantity),
    Number(line.rejectedQuantity),
  ]).toEqual([6, 1]);

  await page.getByTestId("order-bill").click();
  await expect(page).toHaveURL(/\/dashboard\/procurement\/bills\/new/);
  await page.locator('input[name="supplierRef"]').fill("INV-E2E-77");
  await page
    .getByRole("spinbutton", { name: `${copy.lines.unitPrice} 1` })
    .fill("2.5");
  await page.locator('input[name="vatAmount"]').fill("0");
  await page.getByTestId("bill-save").click();
  await expect(page).toHaveURL(
    /\/dashboard\/procurement\/bills\/[0-9a-f-]{36}$/,
    { timeout: 60_000 },
  );
  await expect(
    page.getByTestId("bill-match").getByText(copy.bills.issues.price),
  ).toBeVisible();
  await expect(page.getByTestId("bill-approve")).toBeDisabled();
  await page
    .locator('input[name="overrideReason"]')
    .fill("Supplier price rise agreed by phone");
  await page.getByTestId("bill-approve").click();
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.approved,
  );
  const bill = await db.supplierBill.findFirstOrThrow({
    where: { supplierRef: "INV-E2E-77" },
  });
  expect(Number(bill.total)).toBe(15);
  const expense = await db.expense.findUniqueOrThrow({
    where: { id: bill.expenseId! },
  });
  expect(Number(expense.amount)).toBe(15);
  expect(
    Number(
      (await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: line.id } }))
        .billedQuantity,
    ),
  ).toBe(6);

  await page
    .getByTestId("bill-file")
    .locator('input[name="billFile"]')
    .setInputFiles({
      name: "supplier-invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
      ),
    });
  await expect(page.getByTestId("bill-file").getByRole("link")).toBeVisible();
  expect(
    await db.attachment.count({
      where: { entityType: "supplier_bill", entityId: bill.id },
    }),
  ).toBe(1);
  expect(
    (await db.supplierBill.findUniqueOrThrow({ where: { id: bill.id } }))
      .attachmentUrl,
  ).toMatch(/^\/api\/files\//);

  const pay = page.getByTestId("bill-payment");
  await pay.locator('input[name="paymentAmount"]').fill("5");
  await page.getByTestId("bill-pay").click();
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.partially_paid,
  );
  await pay.locator('input[name="paymentAmount"]').fill("10");
  await page.getByTestId("bill-pay").click();
  await expect(page.getByRole("main").getByTestId("status")).toHaveText(
    copy.statuses.paid,
  );

  await page.goto("/dashboard/procurement/suppliers");
  await expect(page.getByTestId("supplier-performance").first()).toBeVisible();
  errors.assertClean();
});
