import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
import { en as webEn } from "../../locales";
import { ar as webAr } from "../../locales";
import { paymentLinkToken } from "../../lib/services/payment-links";
import { serverMessages } from "../../locales";
import { ports } from "../../playwright.config";
import { testDatabase } from "./helpers/helpers";
const en = enLocale.admin;
const ar = arLocale.admin;

const db = testDatabase();
let orderId: string;
test.beforeEach(async () => {
  const order = await db.salesOrder.create({
    data: {
      number: `E2E-${randomUUID()}`,
      name: "E2E review buyer",
      paymentMethod: "online",
      subtotal: 12.5,
      total: 12.5,
      currency: "BHD",
      paymentAttempts: {
        create: {
          gateway: "stripe",
          sessionId: `cs_${randomUUID()}`,
          amount: 12.5,
          currency: "BHD",
          status: "review",
          failureReason: serverMessages.paymentNeedsReview,
        },
      },
    },
  });
  orderId = order.id;
});
test.afterEach(async () => {
  await db.salesOrder.deleteMany({ where: { id: orderId } });
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const) {
  test(`payment review is actionable for staff and blocks another customer charge (${locale})`, async ({
    page,
  }) => {
    const copy = locale === "en" ? en : ar;
    const web = locale === "en" ? webEn : webAr;
    await page.setViewportSize({
      width: locale === "ar" ? 390 : 1440,
      height: 900,
    });
    await page.addInitScript((locale) => {
      localStorage.setItem("platform_admin_locale", locale);
      localStorage.setItem(
        "platform_admin_theme",
        locale === "ar" ? "dark" : "light",
      );
    }, locale);
    await page.goto(`/dashboard/orders/${orderId}`);
    const main = page.getByRole("main");
    await expect(main.getByTestId("order-attempts")).toContainText(
      copy.orders.detail.attemptStatuses.review,
    );
    await expect(main.getByTestId("order-attempts")).toContainText(
      copy.serverErrors.messages.paymentNeedsReview,
    );
    await expect(
      main.getByRole("button", { name: copy.orders.detail.recheckPayment }),
    ).toBeVisible();
    await page.route("**/dashboard/orders/**", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Test server-action failure",
          })
        : route.continue(),
    );
    await main
      .getByRole("button", { name: copy.orders.detail.recheckPayment })
      .click();
    await expect(main.getByRole("alert")).toBeVisible();
    await expect(
      main.getByRole("button", { name: copy.orders.detail.recheckPayment }),
    ).toBeEnabled();
    const customer = await page.context().newPage();
    await customer.goto(
      `http://localhost:${ports.web}/${locale}/pay/${paymentLinkToken(orderId)}`,
    );
    await expect(customer.getByTestId("pay-review")).toContainText(
      web.store.payReviewTitle,
    );
    await expect(customer.getByTestId("pay-review")).toContainText(
      web.store.payReviewText.split("{number}")[0],
    );
    await expect(customer.getByTestId("pay-now")).toHaveCount(0);
    expect(
      Number(
        (await db.salesOrder.findUniqueOrThrow({ where: { id: orderId } }))
          .amountPaid,
      ),
    ).toBe(0);
    await customer.close();
  });
}
