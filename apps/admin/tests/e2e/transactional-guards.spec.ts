import { expect, test, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
import { testDatabase } from "../../helpers";
const en = enLocale.admin;
const ar = arLocale.admin;

const db =
  testDatabase() as typeof import("../../lib/db").db;
let marker = "",
  contactId = "",
  invoiceId = "",
  dealId = "",
  quotationId = "";
test.beforeEach(async () => {
  marker = `e2e-draft-${randomUUID()}`;
  contactId = (await db.crmContact.create({ data: { firstName: marker } })).id;
  dealId = (
    await db.crmDeal.create({
      data: {
        currency: "BHD",
        title: marker,
        contactId,
        probability: 0,
        dealValue: 100,
      },
    })
  ).id;
  invoiceId = (
    await db.invoice.create({
      data: {
        currency: "BHD",
        invoiceNumber: marker,
        clientId: contactId,
        dueDate: new Date("2050-12-31"),
        subtotal: 5,
        totalAmount: 5,
        status: "draft",
        lineItems: {
          create: {
            descriptionEn: marker,
            quantity: 1,
            unitPrice: 5,
            lineTotal: 5,
          },
        },
      },
    })
  ).id;
  quotationId = (
    await db.quotation.create({
      data: {
        currency: "BHD",
        quotationNumber: marker,
        clientId: contactId,
        status: "accepted",
        validUntilDate: new Date("2050-12-31"),
        subtotal: 7,
        totalAmount: 7,
        language: "en",
        lineItems: {
          create: {
            descriptionEn: marker,
            quantity: 1,
            unitPrice: 7,
            lineTotal: 7,
          },
        },
      },
    })
  ).id;
});
test.afterEach(async () => {
  await db.quotation.deleteMany({ where: { id: quotationId } });
  await db.invoice.deleteMany({ where: { id: invoiceId } });
  await db.crmDeal.deleteMany({ where: { id: dealId } });
  await db.crmContact.deleteMany({
    where: { OR: [{ id: contactId }, { firstName: marker }] },
  });
});
test.afterAll(() => db.$disconnect());

type Copy = typeof en;
const forms: Array<{
  name: string;
  path: () => string;
  field: (main: Locator, t: Copy) => Locator;
}> = [
  {
    name: "invoice",
    path: () => "/dashboard/invoices/new",
    field: (main, t) =>
      main
        .getByPlaceholder(t.invoiceForm.placeholderEn, { exact: true })
        .first(),
  },
  {
    name: "quotation",
    path: () => "/dashboard/quotations/new",
    field: (main, t) =>
      main
        .getByPlaceholder(t.newQuotationForm.eGCommercialVideoProduction, {
          exact: true,
        })
        .first(),
  },
  {
    name: "payment",
    path: () => "/dashboard/payments/new",
    field: (main, t) =>
      main.getByPlaceholder(t.newPaymentView.referenceNumberPlaceholder, {
        exact: true,
      }),
  },
  {
    name: "expense",
    path: () => "/dashboard/expenses/new",
    field: (main, t) =>
      main.getByPlaceholder(t.expensesNew.descriptionPlaceholder, {
        exact: true,
      }),
  },
  {
    name: "claim",
    path: () => "/dashboard/claims/new",
    field: (main, t) =>
      main.getByPlaceholder(t.claims.reasonPlaceholder, { exact: true }),
  },
  {
    name: "employee",
    path: () => "/dashboard/hr/employees/new",
    field: (main, t) =>
      main.getByPlaceholder(t.newEmployeeForm.eGAhmed, { exact: true }),
  },
  {
    name: "user",
    path: () => "/dashboard/users/new",
    field: (main, t) =>
      main.getByPlaceholder(t.usersNew.fullNamePlaceholder, { exact: true }),
  },
  {
    name: "invoice edit",
    path: () => `/dashboard/invoices/${invoiceId}/edit`,
    field: (main) => main.locator("textarea").first(),
  },
  {
    name: "deal edit",
    path: () => `/dashboard/crm/deals/${dealId}/edit`,
    field: (main, t) =>
      main.getByPlaceholder(t.dealEdit.titlePlaceholder, { exact: true }),
  },
];

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`transactional and HR drafts stay on canceled navigation (${locale}, ${theme})`, async ({
      page,
    }) => {
      const t = locale === "en" ? en : ar;
      await page.setViewportSize({
        width: locale === "ar" ? 390 : 1440,
        height: 900,
      });
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem("platform_admin_locale", locale);
          localStorage.setItem("platform_admin_theme", theme);
        },
        { locale, theme },
      );
      for (const form of forms) {
        await test.step(form.name, async () => {
          await page.goto(form.path());
          const main = page.getByRole("main");
          const field = form.field(main, t);
          await expect(field).toBeVisible();
          const original = await field.inputValue();
          await field.fill(marker + " edited");
          const back = page
            .getByRole("banner")
            .locator('a[href="/dashboard"]')
            .first();
          await back.click();
          const dialog = page.getByRole("dialog", {
            name: t.unsavedChanges.title,
            exact: true,
          });
          await expect(dialog).toBeVisible();
          await dialog
            .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
            .click();
          await expect(field).toHaveValue(marker + " edited");
          await field.fill(original);
          await back.click();
          await expect(dialog).toHaveCount(0);
          await expect(page).not.toHaveURL(
            new RegExp(
              form.path().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
            ),
          );
        });
      }
    });
  }

for (const locale of ["en", "ar"] as const) {
  test(`invoice and deal confirmations retain failures and clear successful saves (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript((locale) => {
      localStorage.setItem("platform_admin_locale", locale);
      localStorage.setItem(
        "platform_admin_theme",
        locale === "ar" ? "dark" : "light",
      );
    }, locale);
    for (const type of ["invoice", "deal"] as const) {
      const path =
        type === "invoice"
          ? `/dashboard/invoices/${invoiceId}/edit`
          : `/dashboard/crm/deals/${dealId}/edit`;
      await page.goto(path);
      const main = page.getByRole("main");
      const field =
        type === "invoice"
          ? main.locator("textarea").first()
          : main.getByPlaceholder(t.dealEdit.titlePlaceholder, { exact: true });
      await field.fill(marker + " changed");
      await page.route(`**${path}`, async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({ status: 500, body: "E2E save failure" });
      });
      await main.locator('button[type="submit"]').click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(marker + " changed");
      await dialog
        .getByRole("button", {
          name: t.editConfirmModal.confirmAndSaveChanges,
          exact: true,
        })
        .click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("button", { name: t.editConfirmModal.cancel, exact: true })
        .click();
      await expect(field).toHaveValue(marker + " changed");
      await page.unroute(`**${path}`);
      await main.locator('button[type="submit"]').click();
      await dialog
        .getByRole("button", {
          name: t.editConfirmModal.confirmAndSaveChanges,
          exact: true,
        })
        .click();
      await expect(page).not.toHaveURL(new RegExp(path + "$"));
      await expect(page.getByRole("dialog")).toHaveCount(0);
      if (type === "deal") {
        const saved = await db.crmDeal.findUniqueOrThrow({
          where: { id: dealId },
        });
        expect(saved.title).toBe(marker + " changed");
        expect(saved.probability).toBe(0);
        await expect(main.getByTestId("deal-forecast")).toHaveText(/^0\.000/);
      } else
        expect(
          (await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } }))
            .notesEn,
        ).toBe(marker + " changed");
    }
  });

  test(`quotation prefill is clean and adding a contact cannot reset edits (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    const path = `/dashboard/invoices/new?quotationId=${quotationId}`;
    await page.goto(path);
    const main = page.getByRole("main");
    let description = main
      .getByPlaceholder(t.invoiceForm.placeholderEn, { exact: true })
      .first();
    await expect(description).toHaveValue(marker);
    await main.locator('a[href="/dashboard/invoices"]').click();
    await expect(page).toHaveURL(/\/dashboard\/invoices$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(path);
    description = main
      .getByPlaceholder(t.invoiceForm.placeholderEn, { exact: true })
      .first();
    await expect(description).toHaveValue(marker);
    await description.fill(marker + " edited");
    await main
      .getByTitle(t.crm.clearSelection, { exact: true })
      .first()
      .click();
    await main
      .getByRole("button", {
        name: t.clientAutocomplete.newClient,
        exact: true,
      })
      .click();
    await main
      .getByPlaceholder(t.clientAutocomplete.eGAhmedAbdulla, { exact: true })
      .fill(marker + " client");
    await main
      .getByRole("button", {
        name: t.clientAutocomplete.saveAndSelectClient,
        exact: true,
      })
      .click();
    await expect(
      main.getByPlaceholder(t.clientAutocomplete.eGAhmedAbdulla, {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(description).toHaveValue(marker + " edited");
  });
}

for (const type of ["invoice", "deal"] as const) {
  test(`a pending ${type} save cannot redirect after leaving its editor`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem("platform_admin_locale", "en"),
    );
    const detail =
      type === "invoice"
        ? `/dashboard/invoices/${invoiceId}`
        : `/dashboard/crm/deals/${dealId}`;
    const path = `${detail}/edit`;
    await page.goto(detail);
    await page.getByRole("main").locator(`a[href="${path}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    const main = page.getByRole("main");
    const field =
      type === "invoice"
        ? main.locator("textarea").first()
        : main.getByPlaceholder(en.dealEdit.titlePlaceholder, { exact: true });
    await field.fill(marker + " late save");
    let release!: () => void;
    const blocked = new Promise<void>((done) => {
      release = done;
    });
    let sent!: () => void;
    const responseSent = new Promise<void>((done) => {
      sent = done;
    });
    await page.route(`**${path}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      await blocked;
      await route.fulfill({ response });
      sent();
    });
    try {
      await main.locator('button[type="submit"]').click();
      await page
        .getByRole("dialog")
        .getByRole("button", {
          name: en.editConfirmModal.confirmAndSaveChanges,
          exact: true,
        })
        .click();
      await expect(main.locator('[inert][aria-busy="true"]')).toBeVisible();
      await expect
        .poll(async () =>
          type === "invoice"
            ? (await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } }))
                .notesEn
            : (await db.crmDeal.findUniqueOrThrow({ where: { id: dealId } }))
                .title,
        )
        .toBe(marker + " late save");
      await page.evaluate(() => history.back());
      await page
        .getByRole("dialog", { name: en.unsavedChanges.title, exact: true })
        .getByRole("button", { name: en.unsavedChanges.discard, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${detail}$`));
      await page
        .getByRole("banner")
        .locator('a[href="/dashboard"]')
        .first()
        .click();
      await expect(page).toHaveURL(/\/dashboard$/);
    } finally {
      release();
    }
    await responseSent;
    await expect
      .poll(async () =>
        type === "invoice"
          ? (await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } }))
              .notesEn
          : (await db.crmDeal.findUniqueOrThrow({ where: { id: dealId } }))
              .title,
      )
      .toBe(marker + " late save");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`conversion asks before mutation and preserves an unrelated draft (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.goto(`/dashboard/invoices/new?quotationId=${quotationId}`);
    const main = page.getByRole("main");
    const description = main
      .getByPlaceholder(t.invoiceForm.placeholderEn, { exact: true })
      .first();
    await expect(description).toHaveValue(marker);
    await description.fill(marker + " edited");
    let conversionRequests = 0;
    await page.route("**/dashboard/invoices/new?*", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      conversionRequests++;
      await route.fulfill({ status: 500, body: "E2E conversion failure" });
    });
    const convert = main.getByRole("button", {
      name: t.invoicesList.oneClickConvert,
      exact: true,
    });
    const confirmation = page.getByRole("dialog", {
      name: t.newInvoiceForm.convertConfirmTitle,
      exact: true,
    });
    await convert.click();
    await confirmation
      .getByRole("button", { name: t.actions.cancel, exact: true })
      .click();
    expect(conversionRequests).toBe(0);
    await convert.click();
    await confirmation.getByRole("button").last().click();
    const unsaved = page.getByRole("dialog", {
      name: t.unsavedChanges.title,
      exact: true,
    });
    await unsaved
      .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(description).toHaveValue(marker + " edited");
    expect(conversionRequests).toBe(0);
    await convert.click();
    await confirmation.getByRole("button").last().click();
    await unsaved
      .getByRole("button", { name: t.unsavedChanges.discard, exact: true })
      .click();
    await expect(confirmation.getByRole("alert")).toBeVisible();
    expect(conversionRequests).toBe(1);
    await expect(description).toHaveValue(marker + " edited");
    expect(
      (await db.quotation.findUniqueOrThrow({ where: { id: quotationId } }))
        .status,
    ).toBe("accepted");
  });

  test(`pending claim upload is guarded and a failed upload clears pending work (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.goto("/dashboard/claims/new");
    const main = page.getByRole("main");
    let release!: () => void;
    const blocked = new Promise<void>((done) => {
      release = done;
    });
    await page.route("**/api/upload/init", async (route) => {
      await blocked;
      await route.fulfill({ status: 500, body: "E2E upload failure" });
    });
    try {
      await main.locator('input[type="file"]').setInputFiles({
        name: "e2e-proof.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 E2E"),
      });
      await main.locator('a[href="/dashboard/claims"]').first().click();
      await page
        .getByRole("dialog", { name: t.unsavedChanges.title, exact: true })
        .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
        .click();
    } finally {
      release();
    }
    await expect(main.getByRole("alert")).toBeVisible();
    await main.locator('a[href="/dashboard/claims"]').first().click();
    await expect(page).toHaveURL(/\/dashboard\/claims$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`quotation detail conversion cancels before creating an invoice (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.goto(`/dashboard/quotations/${quotationId}`);
    let requests = 0;
    await page.route(
      `**/dashboard/quotations/${quotationId}`,
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        requests++;
        await route.fulfill({ status: 500, body: "E2E conversion failure" });
      },
    );
    const convert = page.getByRole("main").getByRole("button", {
      name: t.quotationDetail.convertToInvoice,
      exact: true,
    });
    const dialog = page.getByRole("dialog", {
      name: t.newInvoiceForm.convertConfirmTitle,
      exact: true,
    });
    await convert.click();
    await dialog
      .getByRole("button", { name: t.actions.cancel, exact: true })
      .click();
    expect(requests).toBe(0);
    await convert.click();
    await dialog.getByRole("button").last().click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(requests).toBe(1);
    expect(
      (await db.quotation.findUniqueOrThrow({ where: { id: quotationId } }))
        .invoiceId,
    ).toBe(null);
  });
}
