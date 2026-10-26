import { expect, test } from "@playwright/test";
import { testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";

const copy = t.procurement;
const db = testDatabase();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  for (const moduleKey of ["products", "procurement"])
    await db.featureToggle.upsert({
      where: { moduleKey },
      update: { isEnabled: true },
      create: {
        moduleKey,
        nameEn: moduleKey,
        nameAr: moduleKey,
        isEnabled: true,
      },
    });
  // Earlier runs' documents and suppliers.
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
    await page.locator('input[name="supplier-phone"]').fill("+973 3600 0001");
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
  // The administrator's own requisition needs nobody else's approval.
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.approved);

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
    await entry.getByLabel(copy.rfqs.supplier).selectOption({ label: name });
    await entry
      .getByRole("spinbutton", { name: new RegExp(`^${copy.lines.unitPrice}`) })
      .fill(price);
    await page.getByTestId("rfq-quote-save").click();
    await expect(page.getByTestId("rfq-quote-entry")).toHaveCount(0);
  }
  const compare = page.getByTestId("rfq-compare");
  await expect(compare.getByText(copy.rfqs.best)).toHaveCount(1);
  // The cheaper price is chosen already.
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
  await page.getByTestId("order-submit").click();
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.approved);
  await page.getByTestId("order-email").click();
  await expect(page.getByRole("status")).toHaveText(
    copy.orders.emailQueued.replace("{email}", "beta@supplier.example"),
  );
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.sent);
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

test("goods are received into stock, a bill that differs is approved with a reason, then paid", async ({
  page,
}) => {
  const errors = watchErrors(page);
  const product = await db.product.findUniqueOrThrow({
    where: { sku: "E2E-PROC" },
  });
  await page.goto("/dashboard/procurement/orders/new");
  await page
    .getByLabel(copy.orders.supplier)
    .selectOption({ label: "E2E Supplier Alpha" });
  await page
    .getByRole("combobox", { name: copy.lines.product })
    .selectOption({ value: product.id });
  await page
    .getByRole("spinbutton", { name: `${copy.lines.quantity} 1` })
    .fill("10");
  await page
    .getByRole("spinbutton", { name: `${copy.lines.unitPrice} 1` })
    .fill("2");
  await page.getByTestId("order-submit").click();
  await expect(page).toHaveURL(
    /\/dashboard\/procurement\/orders\/[0-9a-f-]{36}$/,
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.approved);

  // 6 arrive in good order and 1 damaged; 3 are still to come.
  const receive = page.getByTestId("receive-goods");
  await receive
    .getByRole("spinbutton", { name: new RegExp(`^${copy.receive.accepted}`) })
    .fill("6");
  await receive
    .getByRole("spinbutton", { name: new RegExp(`^${copy.receive.rejected}`) })
    .fill("1");
  await page.getByTestId("receive-save").click();
  await expect(page.getByTestId("status")).toHaveText(
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

  // The bill asks 2.5 a unit where the order said 2: it needs a reason to be approved.
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
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.approved);
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

  // The supplier's invoice is kept on the bill (and its expense).
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
  await expect(page.getByTestId("status")).toHaveText(
    copy.statuses.partially_paid,
  );
  await pay.locator('input[name="paymentAmount"]').fill("10");
  await page.getByTestId("bill-pay").click();
  await expect(page.getByTestId("status")).toHaveText(copy.statuses.paid);

  await page.goto("/dashboard/procurement/suppliers");
  await expect(page.getByTestId("supplier-performance").first()).toBeVisible();
  errors.assertClean();
});
