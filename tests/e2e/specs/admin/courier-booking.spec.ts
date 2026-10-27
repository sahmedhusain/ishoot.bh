import { selectOption } from "../../select-option";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import en from "../../../../packages/locales/src/admin/en.json";
import ar from "../../../../packages/locales/src/admin/ar.json";
import { testDatabase } from "../../helpers";

const db = testDatabase();
let agencyId: string;
let orderId: string;
let shipmentId: string;
let number: string;
test.beforeEach(async () => {
  const agency = await db.courierAgency.create({
    data: {
      name: `E2E carrier ${randomUUID()}`,
      kind: "dhl_express",
      isActive: true,
    },
  });
  agencyId = agency.id;
  const order = await db.salesOrder.create({
    data: {
      number: `E2E-${randomUUID()}`,
      name: "E2E parcel recipient",
      subtotal: 12.5,
      total: 12.5,
      currency: "BHD",
      paymentMethod: "cod",
    },
  });
  orderId = order.id;
  const shipment = await db.shipment.create({
    data: {
      number: `E2E-${randomUUID()}`,
      orderId,
      promisedBy: new Date(),
      recipientName: "E2E parcel recipient",
      recipientPhone: "+97336000000",
      trackingToken: randomUUID(),
      address: { line1: "Road 2", city: "Manama", country: "Bahrain" },
      courierBookingStatus: "unknown",
      courierBookingStartedAt: new Date(Date.now() - 121_000),
      courierBookingAgencyId: agencyId,
    },
  });
  shipmentId = shipment.id;
  number = shipment.number;
});
test.afterEach(async () => {
  await db.shipmentEvent.deleteMany({ where: { shipmentId } });
  await db.shipment.deleteMany({ where: { id: shipmentId } });
  await db.salesOrder.deleteMany({ where: { id: orderId } });
  await db.courierAgency.deleteMany({ where: { id: agencyId } });
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const) {
  test(`uncertain carrier booking requires measured input and reconciliation (${locale})`, async ({
    page,
  }) => {
    const copy = (locale === "en" ? en : ar).delivery.handover;
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
    await page.goto(`/dashboard/delivery/${shipmentId}`);
    const main = page.getByRole("main");
    await expect(main.getByTestId("courier-booking-warning")).toContainText(
      copy.bookingUncertain,
    );
    await expect(
      main.getByTestId("shipment-move-out_for_delivery"),
    ).toHaveCount(0);
    await expect(main.getByTestId("shipment-handover")).toBeDisabled();
    const card = main.getByTestId("shipment-agency");
    await selectOption(card.locator('select[name="agencyId"]'), agencyId);
    for (const name of ["weightKg", "lengthCm", "widthCm", "heightCm"])
      await expect(card.locator(`input[name="${name}"]`)).toHaveValue("");
    await main.getByTestId("courier-booking-retry").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    for (const [name, value] of Object.entries({
      weightKg: "1.75",
      lengthCm: "31",
      widthCm: "22",
      heightCm: "14",
    }))
      await card.locator(`input[name="${name}"]`).fill(value);
    await main.getByTestId("courier-booking-retry").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(
      copy.retryBody.replace("{number}", number),
    );
    await expect(dialog.locator("button").last()).toBeDisabled();
    await page.keyboard.press("Escape");
    // Never approve an automatic API retry in this browser test: only a confirmed portal tracking number is saved.
    await card
      .locator('input[name="trackingNumber"]')
      .fill("E2E-PORTAL-CONFIRMED");
    await main.getByTestId("shipment-handover").click();
    await dialog.getByRole("textbox").fill(number);
    await dialog.locator("button").last().click();
    await expect(main.getByTestId("shipment-tracking-number")).toHaveText(
      "E2E-PORTAL-CONFIRMED",
    );
    await expect(main.getByTestId("courier-booking-warning")).toHaveCount(0);
    expect(
      (await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } }))
        .courierBookingStatus,
    ).toBe("confirmed");
    await db.shipment.update({
      where: { id: shipmentId },
      data: {
        courierBookingStatus: "pending",
        courierBookingStartedAt: new Date(),
      },
    });
    await page.reload();
    await expect(main.getByTestId("courier-booking-warning")).toContainText(
      copy.bookingPending,
    );
    await expect(main.getByTestId("shipment-handover")).toHaveCount(0);
    await expect(
      main.getByTestId("shipment-move-out_for_delivery"),
    ).toHaveCount(0);
    expect(
      await page
        .locator("main")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  });
}
