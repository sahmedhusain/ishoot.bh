import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { admin, testDatabase } from "../../helpers";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
const en = enLocale.admin;
const ar = arLocale.admin;
const db = testDatabase();
test.afterAll(() => db.$disconnect());
for (const locale of ["en", "ar"] as const) {
  test(`serialized transfer, signing and partial receipt (${locale})`, async ({
    page,
  }) => {
    const copy = (locale === "en" ? en : ar).stockTransfers;
    const tag = randomUUID();
    const actor = await db.user.findUniqueOrThrow({
      where: { email: admin.email },
    });
    const warehouse = await db.warehouse.create({
      data: {
        code: `transfer-ui-${tag}`,
        nameEn: "Transfer test",
        nameAr: "اختبار النقل",
        branchId: "legacy-main",
      },
    });
    const locations = await Promise.all(
      ["SOURCE", "TRANSIT", "DESTINATION"].map((code) =>
        db.stockLocation.create({ data: { code, warehouseId: warehouse.id } }),
      ),
    );
    const product = await db.product.create({
      data: {
        sku: `transfer-ui-${tag}`,
        nameEn: "Transfer fixture",
        nameAr: "صنف اختبار النقل",
      },
    });
    await db.stockLevel.create({
      data: { productId: product.id, locationId: locations[0].id, onHand: 2 },
    });
    const codes = [`TEST-${tag}-1`, `TEST-${tag}-2`];
    await db.serialGeneration.create({
      data: {
        idempotencyKey: tag,
        requestHash: tag,
        productId: product.id,
        locationId: locations[0].id,
        quantity: 2,
        createdById: actor.id,
        serials: {
          create: codes.map((code) => ({
            code,
            productId: product.id,
            locationId: locations[0].id,
            status: "available",
          })),
        },
      },
    });
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.setViewportSize({
      width: locale === "ar" ? 390 : 1280,
      height: 900,
    });
    await page.goto("/dashboard/inventory/transfers");
    for (const [label, location] of [
      [copy.source, locations[0]],
      [copy.transit, locations[1]],
      [copy.destination, locations[2]],
    ] as const) {
      await page.getByRole("combobox", { name: label, exact: true }).click();
      await page
        .locator(`[role="option"][data-option-value="${location.id}"]`)
        .click();
    }
    await page.getByLabel(copy.codes, { exact: true }).fill(codes.join("\n"));
    await page.getByRole("button", { name: copy.request, exact: true }).click();
    await page.getByRole("button", { name: copy.approve, exact: true }).click();
    await page
      .getByRole("button", { name: copy.dispatch, exact: true })
      .click();
    await page
      .getByRole("button", { name: copy.collectionSign, exact: true })
      .click();
    const sign = async () => {
      const canvas = page.locator("canvas");
      await canvas.scrollIntoViewIfNeeded();
      const bounds = (await canvas.boundingBox())!;
      await page.mouse.move(bounds.x + 30, bounds.y + 60);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 120, bounds.y + 95, { steps: 10 });
      await page.mouse.move(bounds.x + 200, bounds.y + 35, { steps: 10 });
      await page.mouse.up();
      await page
        .getByRole("button", { name: copy.confirmSign, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: copy.review, exact: true }),
      ).toHaveCount(0);
    };
    await sign();
    await page.getByLabel(copy.receiveCodes, { exact: true }).fill(codes[0]);
    await page.getByRole("button", { name: copy.receive, exact: true }).click();
    await expect(
      page.getByRole("button", { name: copy.receiptSign, exact: true }),
    ).toBeVisible();
    await page.getByLabel(copy.receiveCodes, { exact: true }).fill(codes[1]);
    await page.getByRole("button", { name: copy.receive, exact: true }).click();
    await expect(
      page.getByRole("button", { name: copy.receive, exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: copy.receiptSign, exact: true })
      .click();
    await sign();
    await page.getByRole("button", { name: copy.close, exact: true }).click();
    await expect(
      page.getByRole("button", { name: copy.close, exact: true }),
    ).toHaveCount(0);
    const serials = await db.stockSerial.findMany({
      where: { productId: product.id },
    });
    expect(
      serials.every(
        (s) => s.locationId === locations[2].id && s.status === "available",
      ),
    ).toBe(true);
    expect(
      (
        await db.stockLevel.aggregate({
          where: { productId: product.id },
          _sum: { onHand: true },
        })
      )._sum.onHand?.toString(),
    ).toBe("2");
  });
}
