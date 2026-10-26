import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import en from "../../../../packages/locales/src/admin/en.json";
import ar from "../../../../packages/locales/src/admin/ar.json";
import { testDatabase } from "../../helpers";

const db = testDatabase() as typeof import("../../../../packages/database/src/db").db;
let quotationId = "";
let componentId = "";
let invoiceId = "";
let paymentId = "";
test.beforeEach(async () => {
  quotationId = componentId = invoiceId = paymentId = "";
  const quotation = await db.quotation.create({ data: { quotationNumber: `E2E-${randomUUID()}`, status: "issued", validUntilDate: new Date("2050-12-31") } });
  quotationId = quotation.id;
  const component = await db.gosiComponent.create({ data: { code: `E2E-${randomUUID()}`, nameEn: "E2E dialog component", nameAr: "بند اختبار الحوار", effectiveFrom: new Date("2000-01-01") } });
  componentId = component.id;
  const invoice = await db.invoice.create({ data: { invoiceNumber: `E2E-${randomUUID()}`, dueDate: new Date("2050-12-31"), subtotal: 1, totalAmount: 1, status: "paid" } });
  invoiceId = invoice.id;
  const payment = await db.payment.create({ data: { invoiceId, receiptNumber: `E2E-${randomUUID()}`, amount: 1 } });
  paymentId = payment.id;
});
test.afterEach(async () => {
  await db.payment.deleteMany({ where: { id: paymentId } });
  await db.invoice.deleteMany({ where: { id: invoiceId } });
  await db.quotation.deleteMany({ where: { id: quotationId } });
  await db.gosiComponent.deleteMany({ where: { id: componentId } });
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const) {
  test(`form dialogs preserve cancelled records and failed input (${locale})`, async ({ page }) => {
    const t = locale === "en" ? en : ar;
    await page.setViewportSize({ width: locale === "ar" ? 390 : 1440, height: 900 });
    await page.addInitScript(locale => { localStorage.setItem("platform_admin_locale", locale); localStorage.setItem("platform_admin_theme", locale === "ar" ? "dark" : "light"); }, locale);
    const nativeDialogs: string[] = [];
    page.on("dialog", async dialog => { nativeDialogs.push(dialog.type()); await dialog.dismiss(); });
    await page.goto(`/dashboard/quotations/${quotationId}`);
    const decline = page.getByRole("main").getByRole("button", { name: t.quotationLifecycle.clientDeclined, exact: true });
    const dialog = page.getByRole("dialog");
    await decline.click();
    await dialog.getByRole("button", { name: t.actions.cancel, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect((await db.quotation.findUniqueOrThrow({ where: { id: quotationId } })).status).toBe("issued");
    await decline.click();
    const reason = dialog.getByRole("textbox", { name: t.quotationLifecycle.declineReasonPrompt, exact: true });
    await reason.fill("E2E reason retained");
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/dashboard/quotations/**", async route => {
      if (route.request().method() !== "POST") return route.continue();
      await blocked; await route.fulfill({ status: 500, contentType: "text/plain", body: "Test action failure" });
    });
    await dialog.getByRole("button", { name: t.quotationLifecycle.markDeclined, exact: true }).click();
    try {
      await expect(dialog.getByRole("button", { name: t.actions.cancel, exact: true })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
    } finally { release(); }
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(reason).toHaveValue("E2E reason retained");
    await dialog.getByRole("button", { name: t.actions.cancel, exact: true }).click();
    expect((await db.quotation.findUniqueOrThrow({ where: { id: quotationId } })).status).toBe("issued");

    await page.goto("/dashboard/hr/gosi");
    await page.getByRole("row").filter({ hasText: locale === "en" ? "E2E dialog component" : "بند اختبار الحوار" }).getByRole("button", { name: t.gosi.history, exact: true }).click();
    await page.getByRole("main").getByRole("button", { name: t.gosi.end, exact: true }).click();
    const endDate = dialog.getByLabel(t.gosi.endDateLabel, { exact: true });
    await endDate.fill("1999-12-31");
    await dialog.getByRole("button", { name: t.gosi.end, exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText(t.gosi.endBeforeStart);
    await endDate.fill("2000-01-02");
    await page.route("**/dashboard/hr/gosi", route => route.request().method() === "POST" ? route.fulfill({ status: 500, contentType: "text/plain", body: "Test action failure" }) : route.continue());
    await dialog.getByRole("button", { name: t.gosi.end, exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(endDate).toHaveValue("2000-01-02");
    await dialog.getByRole("button", { name: t.actions.cancel, exact: true }).click();
    expect((await db.gosiComponent.findUniqueOrThrow({ where: { id: componentId } })).effectiveTo).toBeNull();

    await page.goto(`/dashboard/payments/${paymentId}`);
    const main = page.getByRole("main");
    await main.getByRole("button", { name: t.linkOrUpload.addLink, exact: true }).click();
    const url = main.getByRole("textbox", { name: t.linkOrUpload.urlLabel, exact: true });
    await url.fill("https://example.test/payment-proof");
    await page.route("**/dashboard/payments/**", route => route.request().method() === "POST" ? route.fulfill({ status: 500, contentType: "text/plain", body: "Test action failure" }) : route.continue());
    await main.getByRole("button", { name: t.linkOrUpload.useLink, exact: true }).click();
    await expect(main.getByRole("alert")).toBeVisible();
    await expect(url).toHaveValue("https://example.test/payment-proof");
    await expect(main.getByRole("button", { name: t.linkOrUpload.useLink, exact: true })).toBeEnabled();
    expect(await db.attachment.count({ where: { entityType: "payment", entityId: paymentId } })).toBe(0);
    expect(nativeDialogs).toEqual([]);
  });
}
