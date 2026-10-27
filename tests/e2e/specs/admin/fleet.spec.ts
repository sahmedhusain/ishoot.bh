import { selectOption } from "../../select-option";
import { acceptConfirmations } from "../../helpers";
import zlib from "node:zlib";
import { expect, test, type Browser, type Page } from "@playwright/test";
import users from "../../fixtures/users.json";
import { ports } from "../../../../playwright.config";
import { login, testDatabase, watchErrors } from "../../helpers";
import { t } from "../../locale";
import {
  disableDelivery,
  enableDelivery,
  enableStore,
  freshStockedProduct,
} from "../../store-fixtures";

const copy = t.delivery;
const db = testDatabase();
const web = `http://localhost:${ports.web}`;
const PLATE = "E2E 100";
let productId = "";
let driverId = "";
const shipments: { id: string; number: string; orderId: string }[] = [];

test.describe.configure({ mode: "serial" });

/** A small valid PNG, standing in for a phone photo. */
function photo() {
  const crc = (buf: Buffer) => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(8, 0);
  header.writeUInt32BE(8, 4);
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.concat(
    Array.from({ length: 8 }, () =>
      Buffer.concat([Buffer.from([0]), Buffer.alloc(24, 0x5a)]),
    ),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function placeDeliveryOrder(page: Page, name: string) {
  const response = await page.request.post(`${web}/api/store/order`, {
    headers: { origin: web },
    data: {
      lines: [{ productId, quantity: 1 }],
      fulfilment: "delivery",
      address: {
        name,
        phone: "+973 3600 0008",
        line1: "Road 5",
        city: "Muharraq",
        country: "Bahrain",
      },
      name,
      email: "e2e-route-buyer@example.test",
      phone: "+973 3600 0008",
      paymentMethod: "cod",
      locale: "en",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const order = await db.salesOrder.findFirstOrThrow({
    where: { name },
    orderBy: { placedAt: "desc" },
    include: { shipments: true },
  });
  return {
    id: order.shipments[0].id,
    number: order.shipments[0].number,
    orderId: order.id,
  };
}

test.beforeAll(async () => {
  await enableStore(db);
  await enableDelivery(db);
  const user = await db.user.findUniqueOrThrow({
    where: { email: users.driver.email },
  });
  const employee = await db.employee.upsert({
    where: { userId: user.id },
    update: { status: "active" },
    create: {
      employeeNumber: "E2E-DRV-1",
      userId: user.id,
      firstNameEn: "Dana",
      lastNameEn: "Driver",
      firstNameAr: "دانة",
      lastNameAr: "السائقة",
      jobTitleEn: "Driver",
      jobTitleAr: "سائقة",
      hireDate: new Date("2026-01-01"),
    },
  });
  driverId = employee.id;
  await db.shipment.updateMany({
    where: { driverId },
    data: { routeSheetId: null, codSettlementId: null, driverId: null },
  });
  await db.routeSheet.deleteMany({ where: { driverId } });
  await db.codSettlement.deleteMany({ where: { driverId } });
  await db.vehicle.deleteMany({ where: { plate: PLATE } });
  productId = (
    await freshStockedProduct(db, {
      sku: "E2E-ROUTE",
      nameEn: "E2E Route Item",
      nameAr: "صنف المسار",
      price: 5,
      onHand: 10,
    })
  ).id;
});

test.afterAll(async () => {
  await disableDelivery(db);
  await db.$disconnect();
});

test("a vehicle is added and the driver is listed", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/dashboard/delivery/fleet");
  await page.getByRole("button", { name: copy.fleet.add }).first().click();
  await page.locator('input[name="plate"]').fill(PLATE.toLowerCase());
  await page.locator('input[name="vehicleName"]').fill("Delivery van");
  await page.getByTestId("vehicle-save").first().click();
  await expect(page.getByTestId("vehicles-list").first()).toContainText(PLATE);
  await expect(page.getByTestId("drivers-list").first()).toContainText(
    "دانة السائقة",
  );
  errors.assertClean();
});

test("a route sheet puts two shipments in order and sends the driver out", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await acceptConfirmations(page);
  shipments.push(
    await placeDeliveryOrder(page, "Route Buyer A"),
    await placeDeliveryOrder(page, "Route Buyer B"),
  );
  await page.goto("/dashboard/delivery/routes");
  await page.getByRole("button", { name: copy.routes.new }).first().click();
  const planner = page.getByTestId("route-planner").first();
  await selectOption(planner.locator('select[name="routeDriver"]'), driverId);
  for (const s of shipments)
    await planner.getByRole("checkbox", { name: s.number }).check();
  // B goes first.
  await planner
    .getByRole("button", {
      name: copy.routes.up.replace("{number}", shipments[1].number),
    })
    .click();
  await planner.getByTestId("route-create").click();
  await expect(page).toHaveURL(
    /\/dashboard\/delivery\/routes\/[0-9a-f-]{36}$/,
    { timeout: 60_000 },
  );
  await expect(
    page.getByTestId("route-stops").locator("tbody tr").first(),
  ).toContainText("Route Buyer B");
  await page.getByTestId("route-start").click();
  await expect(page.getByTestId("route-status")).toHaveText(
    copy.routes.statuses.out,
  );
  for (const s of shipments) {
    const row = await db.shipment.findUniqueOrThrow({
      where: { id: s.id },
      include: { order: true },
    });
    expect(row.status).toBe("out_for_delivery");
    expect(row.driverId).toBe(driverId);
    expect(row.order.status).toBe("shipped");
  }
  errors.assertClean();
});

async function driverPage(browser: Browser) {
  const context = await browser.newContext({
    baseURL: `http://localhost:${ports.admin}`,
  });
  const page = await context.newPage();
  await login(page, users.driver.email, users.driver.password);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  return page;
}

test("the driver delivers one stop with a signature and one with a photo, and cannot open other shipments", async ({
  browser,
}) => {
  const page = await driverPage(browser);
  const errors = watchErrors(page);
  const other = await placeDeliveryOrder(page, "Not For Driver");
  await page.goto("/dashboard/driver");
  const stops = page.getByTestId("driver-stops").first();
  await expect(stops.locator("li")).toHaveCount(2);

  // Stop 1 (B): the customer signs.
  const first = page.getByTestId(`driver-stop-${shipments[1].number}`).first();
  await first.getByTestId("driver-delivered").click();
  const canvas = first.locator("canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++)
    await page.mouse.move(
      box.x + 20 + i * 15,
      box.y + box.height / 2 + (i % 2 ? 15 : -15),
    );
  await page.mouse.up();
  await first.getByTestId("driver-confirm").click();
  await expect(
    page.getByTestId(`driver-stop-${shipments[1].number}`),
  ).toHaveCount(0);

  // Stop 2 (A): a photo.
  const second = page.getByTestId(`driver-stop-${shipments[0].number}`).first();
  await second.getByTestId("driver-delivered").click();
  await second.locator('input[name="deliveryPhoto"]').setInputFiles({
    name: "door.png",
    mimeType: "image/png",
    buffer: photo(),
  });
  await expect(second.getByText(copy.driverView.photoTaken)).toBeVisible();
  await second.getByTestId("driver-confirm").click();
  await expect(
    page.getByTestId(`driver-stop-${shipments[0].number}`),
  ).toHaveCount(0);

  const [b, a] = await Promise.all(
    shipments
      .slice()
      .reverse()
      .map((s) =>
        db.shipment.findUniqueOrThrow({
          where: { id: s.id },
          include: { order: true },
        }),
      ),
  );
  expect(b.status).toBe("delivered");
  expect(b.proofSignature).toMatch(/^data:image\/png;base64,/);
  expect(a.status).toBe("delivered");
  expect(a.proofPhotoUrl).toMatch(/^\/api\/files\/general\//);
  expect(
    await db.attachment.count({
      where: { entityType: "shipment", entityId: a.id },
    }),
  ).toBe(1);
  expect(a.order.status).toBe("delivered");
  expect(Number(a.codCollected)).toBe(Number(a.codAmount));

  // Another shipment is not theirs.
  await page.goto(`/dashboard/delivery/${other.id}`);
  await expect(page.getByTestId("shipment-history")).toHaveCount(0);
  await expect(page.getByText(other.number)).toHaveCount(0);
  // Nor can they move it.
  await page.goto("/dashboard/driver");
  await expect(page.getByTestId(`driver-stop-${other.number}`)).toHaveCount(0);
  errors.assertClean();
  await page.context().close();
});

test("the sheet is closed and the driver's cash is handed over, paying the orders", async ({
  page,
}) => {
  const errors = watchErrors(page);
  const sheet = await db.routeSheet.findFirstOrThrow({
    where: { driverId },
    orderBy: { createdAt: "desc" },
  });
  await page.goto(`/dashboard/delivery/routes/${sheet.id}`);
  await page.getByTestId("route-close").click();
  await expect(page.getByTestId("route-status")).toHaveText(
    copy.routes.statuses.closed,
  );

  await page.goto("/dashboard/delivery/cash");
  const card = page
    .getByTestId("cash-driver")
    .filter({ hasText: "دانة السائقة" })
    .first();
  const totals = await db.shipment.aggregate({
    where: { id: { in: shipments.map((s) => s.id) } },
    _sum: { codCollected: true },
  });
  const expected = Number(totals._sum.codCollected);
  await card.locator('input[name="cashReceived"]').fill(String(expected - 1));
  await card.getByTestId("cash-settle").click();
  await expect(page.getByTestId("cash-history").first()).toContainText(
    copy.cash.difference,
  );
  const settlement = await db.codSettlement.findFirstOrThrow({
    where: { driverId },
    orderBy: { settledAt: "desc" },
  });
  expect(Number(settlement.expected)).toBe(expected);
  expect(Number(settlement.received)).toBe(expected - 1);
  for (const s of shipments) {
    const order = await db.salesOrder.findUniqueOrThrow({
      where: { id: s.orderId },
    });
    expect(order.paymentStatus).toBe("paid");
  }
  errors.assertClean();
});
