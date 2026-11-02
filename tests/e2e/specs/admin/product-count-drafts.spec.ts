import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import en from "../../../../packages/locales/src/admin/en";
import ar from "../../../../packages/locales/src/admin/ar";
import { testDatabase } from "../../helpers";
import { getModule, resetModule, setModule } from "../../modules";
const db =
  testDatabase() as typeof import("../../../../packages/database/src/db").db;
let marker = "",
  productIds: string[] = [],
  warehouseId = "",
  countId = "",
  lineIds: string[] = [];
let originalFeature: Awaited<ReturnType<typeof getModule>>;
test.beforeAll(async () => {
  originalFeature = await getModule("products");
  await setModule("products", true);
});
test.beforeEach(async () => {
  marker = `E2E-DRAFT-${randomUUID()}`;
  productIds = [];
  for (let i = 0; i < 3; i++)
    productIds.push(
      (
        await db.product.create({
          data: {
            sku: `${marker}-${i}`,
            nameEn: `${marker}-${i}`,
            nameAr: `منتج ${i}`,
            price: 5,
          },
        })
      ).id,
    );
  warehouseId = (
    await db.warehouse.create({
      data: {
        code: marker,
        nameEn: marker,
        nameAr: "مستودع الاختبار",
        branchId: (
          await db.branch.findFirstOrThrow({ where: { isActive: true } })
        ).id,
      },
    })
  ).id;
  const location = await db.stockLocation.create({
    data: { warehouseId, code: "MAIN" },
  });
  const count = await db.stockCount.create({
    data: {
      number: marker,
      warehouseId,
      lines: {
        create: productIds.slice(0, 2).map((productId) => ({
          productId,
          locationId: location.id,
          expected: 10,
        })),
      },
    },
    include: { lines: true },
  });
  countId = count.id;
  lineIds = productIds
    .slice(0, 2)
    .map((id) => count.lines.find((line) => line.productId === id)!.id);
});
test.afterEach(async () => {
  await db.stockCount.deleteMany({ where: { id: countId } });
  await db.stockLocation.deleteMany({ where: { warehouseId } });
  await db.warehouse.deleteMany({ where: { id: warehouseId } });
  await db.stockItem.deleteMany({ where: { productId: { in: productIds } } });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
});
test.afterAll(async () => {
  if (originalFeature) await setModule("products", originalFeature.isEnabled);
  else await resetModule("products");
  await db.$disconnect();
});

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`product and count drafts survive canceled navigation (${locale}, ${theme})`, async ({
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
      for (const kind of ["product", "new product", "count"] as const) {
        await page.goto(
          kind === "count"
            ? `/dashboard/inventory/counts/${countId}`
            : kind === "new product"
              ? "/dashboard/products/new"
              : `/dashboard/products/${productIds[0]}`,
        );
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        const main = page.getByRole("main");
        const field =
          kind === "count"
            ? main.getByRole("spinbutton").first()
            : main.locator('input[name="sku"]');
        const original = await field.inputValue();
        await field.fill(kind === "count" ? "0" : marker);
        const home = page
          .getByRole("banner")
          .locator('a[href="/dashboard"]')
          .first();
        await home.click();
        const dialog = page.getByRole("dialog", {
          name: t.unsavedChanges.title,
          exact: true,
        });
        await expect(dialog).toBeVisible();
        await dialog
          .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
          .click();
        await expect(field).toHaveValue(kind === "count" ? "0" : marker);
        await field.fill(original);
        await home.click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    });
  }

for (const locale of ["en", "ar"] as const) {
  test(`product validation and failed confirmations preserve drafts (${locale})`, async ({
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
    const path = `/dashboard/products/${productIds[0]}`;
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const main = page.getByRole("main"),
      save = main.getByTestId("product-save");
    await main
      .getByRole("button", { name: t.products.editor.addOption, exact: true })
      .click();
    await save.click();
    await expect(main.getByRole("alert")).toHaveText(
      t.serverErrors.messages.productOptionsInvalid,
    );
    await expect(
      main.getByRole("button", {
        name: t.products.editor.removeOption,
        exact: true,
      }),
    ).toBeVisible();
    await main
      .getByRole("textbox", {
        name: `${t.products.editor.optionName} (${t.websiteEditor.inEnglish})`,
        exact: true,
      })
      .fill("Size");
    await main
      .getByRole("textbox", {
        name: `${t.products.editor.optionValues} (${t.websiteEditor.inEnglish})`,
        exact: true,
      })
      .fill("S");
    await main
      .getByRole("textbox", {
        name: `${t.products.editor.optionValues} (${t.websiteEditor.inArabic})`,
        exact: true,
      })
      .fill("صغير، متوسط");
    await save.click();
    await expect(main.getByRole("alert")).toHaveText(
      t.serverErrors.messages.productOptionsInvalid,
    );
    await main
      .getByRole("textbox", {
        name: `${t.products.editor.optionValues} (${t.websiteEditor.inArabic})`,
        exact: true,
      })
      .fill("صغير");
    await main
      .getByRole("button", { name: t.products.editor.fillSkus, exact: true })
      .click();
    const image = main.getByPlaceholder(t.assetField.urlPlaceholder, {
      exact: true,
    });
    await image.fill("/api/files/products/e2e.png");
    await save.click();
    await expect(main.getByRole("alert")).toHaveText(
      t.products.editor.pendingImage,
    );
    await expect(image).toHaveValue("/api/files/products/e2e.png");
    await main
      .getByRole("button", { name: t.products.editor.addImage, exact: true })
      .click();
    await page.route(`**${path}`, async (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, body: "Test failure" })
        : route.continue(),
    );
    for (const control of [
      main.getByTestId("product-website"),
      main.getByRole("button", { name: t.products.editor.delete, exact: true }),
    ]) {
      await control.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await control.click();
      await dialog.getByRole("button").last().click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await page.keyboard.press("Escape");
      expect(
        (await db.product.findUniqueOrThrow({ where: { id: productIds[0] } }))
          .catalogueItemId,
      ).toBeNull();
    }
    await save.click();
    await expect(main.getByRole("alert")).toBeVisible();
    await expect(
      main.getByRole("button", {
        name: t.products.editor.removeImage.replace("{number}", "1"),
        exact: true,
      }),
    ).toBeVisible();
    await page.unroute(`**${path}`);
    await save.click();
    await expect(main.getByRole("status")).toHaveText(t.products.editor.saved);
    const saved = await db.product.findUniqueOrThrow({
      where: { id: productIds[0] },
      include: { variants: true },
    });
    expect(saved.imageUrls).toEqual(["/api/files/products/e2e.png"]);
    expect(saved.options).toEqual([
      { nameEn: "Size", nameAr: "Size", values: [{ en: "S", ar: "صغير" }] },
    ]);
    expect(saved.variants.map((variant) => variant.optionValues)).toEqual([
      ["S"],
    ]);
    await page
      .getByRole("banner")
      .locator('a[href="/dashboard"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test(`count saves keep zero and concurrent untouched quantities; scans stay clean (${locale})`, async ({
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
    const path = `/dashboard/inventory/counts/${countId}`;
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const main = page.getByRole("main"),
      fields = main.getByRole("spinbutton");
    await fields.first().fill("0");
    await db.stockCountLine.update({
      where: { id: lineIds[1] },
      data: { counted: 7 },
    });
    await main.getByTestId("count-save").click();
    await expect(main.getByRole("status")).toHaveText(t.inventory.counts.saved);
    expect(
      Number(
        (
          await db.stockCountLine.findUniqueOrThrow({
            where: { id: lineIds[0] },
          })
        ).counted,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          await db.stockCountLine.findUniqueOrThrow({
            where: { id: lineIds[1] },
          })
        ).counted,
      ),
    ).toBe(7);
    await expect(fields.nth(1)).toHaveValue("7");
    const scan = main.locator('input[name="scan"]');
    await scan.fill(`${marker}-2`);
    await scan.press("Enter");
    await expect(fields).toHaveCount(3);
    await expect(fields.last()).toBeFocused();
    await expect(fields.last()).toHaveValue("");
    await page
      .getByRole("banner")
      .locator('a[href="/dashboard"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await fields.first().fill("2");
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    await page.route(`**${path}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      posts++;
      await blocked;
      await route.fulfill({ status: 500, body: "Test failure" });
    });
    await scan.fill(`${marker}-2`);
    await scan.press("Enter");
    try {
      await expect(main.locator('[aria-busy="true"]')).toBeVisible();
    } finally {
      release();
    }
    await expect(main.getByRole("alert")).toBeVisible();
    await expect(scan).toBeFocused();
    await expect(fields.first()).toHaveValue("2");
    expect(posts).toBe(1);
    await main
      .getByRole("button", { name: t.inventory.counts.cancel, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button").last().click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(fields.first()).toHaveValue("2");
    expect(
      (await db.stockCount.findUniqueOrThrow({ where: { id: countId } }))
        .status,
    ).toBe("counting");
    expect(
      await db.stockMovement.count({
        where: { productId: { in: productIds } },
      }),
    ).toBe(0);
    await page.unroute(`**${path}`);
    await main
      .getByRole("button", { name: t.inventory.counts.cancel, exact: true })
      .click();
    await dialog.getByRole("button").last().click();
    await expect(dialog).toHaveCount(0);
    await expect(main.getByTestId("count-status")).toHaveText(
      t.inventory.counts.statuses.cancelled,
    );
    await expect(
      main
        .getByTestId("count-lines")
        .locator("tbody tr")
        .first()
        .locator("td")
        .nth(3),
    ).toHaveText("0");
    await page
      .getByRole("banner")
      .locator('a[href="/dashboard"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test(`stock-count approval keeps typed confirmation open on failure (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await db.stockCount.update({
      where: { id: countId },
      data: { status: "review" },
    });
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    const path = `/dashboard/inventory/counts/${countId}`;
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.route(`**${path}`, async (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500, body: "Test failure" })
        : route.continue(),
    );
    await page.getByRole("main").getByTestId("count-approve").click();
    const dialog = page.getByRole("dialog"),
      submit = dialog.getByRole("button").last();
    await expect(submit).toBeDisabled();
    await dialog.getByRole("textbox").fill(marker);
    await submit.click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("textbox")).toHaveValue(marker);
    expect(
      (await db.stockCount.findUniqueOrThrow({ where: { id: countId } }))
        .status,
    ).toBe("review");
    expect(
      await db.stockMovement.count({
        where: { productId: { in: productIds } },
      }),
    ).toBe(0);
  });
}

test("large stock-count saves retain only the failed batch for retry", async ({
  page,
}) => {
  test.setTimeout(180000);
  const extra = Array.from({ length: 499 }, (_, i) => ({
    id: randomUUID(),
    sku: `${marker}-EX-${i}`,
    nameEn: `Count ${i}`,
    nameAr: `صنف ${i}`,
  }));
  await db.product.createMany({ data: extra });
  productIds.push(...extra.map((row) => row.id));
  const location = await db.stockLocation.findFirstOrThrow({
    where: { warehouseId },
  });
  await db.stockCountLine.createMany({
    data: extra.map((product) => ({
      productId: product.id,
      countId,
      locationId: location.id,
      expected: 0,
    })),
  });
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  const path = `/dashboard/inventory/counts/${countId}`;
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const main = page.getByRole("main"),
    fields = main.getByRole("spinbutton");
  await expect(fields).toHaveCount(501);
  // Set up the capacity fixture with native input events; per-field interaction is covered above.
  await fields.evaluateAll((inputs) => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    for (const input of inputs) {
      setValue.call(input, "0");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await expect(fields.first()).toHaveValue("0");
  await expect(fields.last()).toHaveValue("0");
  let posts = 0;
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    if (posts === 2)
      await route.fulfill({ status: 500, body: "Test second batch failure" });
    else await route.continue();
  });
  await main.getByTestId("count-save").click();
  await expect(main.getByRole("alert")).toContainText(
    en.inventory.counts.partialSaved
      .replace("{saved}", "200")
      .replace("{total}", "501"),
  );
  expect(
    await db.stockCountLine.count({ where: { countId, counted: 0 } }),
  ).toBe(200);
  expect(
    await db.stockCountLine.count({ where: { countId, counted: null } }),
  ).toBe(301);
  await page
    .getByRole("banner")
    .locator('a[href="/dashboard"]')
    .first()
    .click();
  const dialog = page.getByRole("dialog", {
    name: en.unsavedChanges.title,
    exact: true,
  });
  await dialog
    .getByRole("button", { name: en.unsavedChanges.stay, exact: true })
    .click();
  await main.getByTestId("count-save").click();
  await expect(main.getByRole("status")).toHaveText(en.inventory.counts.saved);
  expect(posts).toBe(4);
  expect(
    await db.stockCountLine.count({ where: { countId, counted: 0 } }),
  ).toBe(501);
  await page
    .getByRole("banner")
    .locator('a[href="/dashboard"]')
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
