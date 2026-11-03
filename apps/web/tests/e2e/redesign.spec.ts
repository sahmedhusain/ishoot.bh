import { createHash, createHmac, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { admin, testDatabase, watchErrors } from "../../helpers";
import {
  defaultWebsiteCommerce,
  type PublicBranch,
} from "@platform/database/constants/website-commerce";
import {
  enableStore,
  freshStockedProduct,
  stockOf,
} from "../../store-fixtures";
import {
  INDUSTRY_PAGES,
  industryPageBlocks,
} from "@platform/database/cms/industry-pages";
import { newBlockData } from "@platform/database/cms/blocks";
import { defaultWebsiteDesign } from "@platform/database/constants/website-design";
import { getModule, setModule } from "../../modules";
import { setIntegration } from "../../integrations";

const db = testDatabase();
const branch: PublicBranch = {
  id: "seef",
  nameEn: "Seef collection point",
  nameAr: "نقطة استلام السيف",
  addressEn: "Road 1, Block 2",
  addressAr: "طريق ١، مجمع ٢",
  city: "Manama",
  country: "Bahrain",
  phone: "+97336000010",
  hoursEn: "Sun–Thu 09:00–17:00",
  hoursAr: "الأحد–الخميس ٩–١٧",
  directionsUrl: "",
  latitude: 26.23,
  longitude: 50.54,
  active: true,
  pickup: true,
};
test.describe.configure({ mode: "serial" });
let original: { draft: unknown; published: unknown; previous: unknown };
let originalPr = false;
let originalBrand: { theme: unknown; logoUrl: string | null };
async function invalidate(
  request: import("@playwright/test").APIRequestContext,
) {
  await request.post("/api/revalidate", {
    headers: { "x-revalidate-secret": process.env.REVALIDATION_SECRET! },
    data: { tags: ["website", "company"], paths: ["/"] },
  });
}
test.beforeAll(async () => {
  original = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
    select: { draft: true, published: true, previous: true },
  });
  originalBrand = await db.companySetting.findUniqueOrThrow({
    where: { singleton: 1 },
    select: { theme: true, logoUrl: true },
  });
  originalPr = (await getModule("pr"))?.isEnabled ?? false;
  await setModule("pr", true);
  await enableStore(db);
  await setIntegration("resend", false);
});
test.afterAll(async ({ request }) => {
  if (original)
    await db.websiteContent.update({
      where: { id: "main" },
      data: {
        draft: original.draft as never,
        published: original.published as never,
        previous: original.previous as never,
      },
    });
  if (originalBrand)
    await db.companySetting.update({
      where: { singleton: 1 },
      data: {
        theme: originalBrand.theme as never,
        logoUrl: originalBrand.logoUrl,
      },
    });
  await setModule("pr", originalPr);
  await invalidate(request);
  await db.$disconnect();
});

test("CMS design saves privately, previews, publishes and survives reload", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(180_000);
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  await page.goto("http://localhost:3012/login");
  await page.locator('input[type="email"]:visible').fill(admin.email);
  await page.locator('input[type="password"]:visible').fill(admin.password);
  await page.locator('button[type="submit"]:visible').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 60_000 });
  await page.goto("http://localhost:3012/dashboard/cms/website");
  const design = page
    .locator("#admin-main")
    .getByTestId("website-design-fields");
  await expect(design).toBeVisible();
  const select = async (name: string, value: string) => {
    await design.getByRole("combobox", { name, exact: true }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  };
  await select("Default appearance", "Mixed");
  await design.getByLabel("Allow visitors to switch appearance").check();
  await design.getByText("Mixed appearance regions", { exact: true }).click();
  await select("Header", "Dark");
  await select("Footer", "Dark");
  await select("Contact", "Light");
  await select("Motion", "Off");
  await page.getByRole("button", { name: /^Save draft/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "saved" }),
  ).toBeVisible();
  const saved = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  expect((saved.draft as any).design.defaultMode).toBe("mixed");
  expect((saved.published as any).config.design).toEqual(
    (original.published as any).config.design,
  );
  await page
    .getByRole("button", { name: "Create preview link", exact: true })
    .click();
  const preview = await page
    .getByRole("link", { name: /Open preview/ })
    .getAttribute("href");
  const previewPage = await context.newPage();
  await previewPage.goto(preview!);
  await expect(previewPage.locator("html")).toHaveAttribute(
    "data-site-mode",
    "mixed",
  );
  await previewPage.close();
  await page
    .getByRole("button", { name: "Publish website", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("button").last().click();
  await expect
    .poll(
      async () =>
        (await db.websiteContent.findUniqueOrThrow({ where: { id: "main" } }))
          .revision,
    )
    .toBeGreaterThan(saved.revision);
  const publicPage = await context.browser()!.newPage();
  await invalidate(request);
  await publicPage.goto("http://localhost:3013/en/contact");
  await expect(publicPage.locator("html")).toHaveAttribute(
    "data-site-mode",
    "mixed",
  );
  await expect(
    publicPage.locator('[data-site-region="header"]'),
  ).toHaveAttribute("data-site-tone", "dark");
  await expect(publicPage.locator("main")).toHaveAttribute(
    "data-site-tone",
    "light",
  );
  await publicPage.reload();
  await expect(publicPage.locator("html")).toHaveAttribute(
    "data-site-mode",
    "mixed",
  );
  const originalMode =
    (original.published as any)?.config?.design?.defaultMode ??
    (original.published as any)?.brandTheme?.websiteMode ??
    (originalBrand.theme as any)?.websiteMode ??
    "dark";
  for (const expectedMode of [originalMode, "mixed"]) {
    await page.reload();
    const current = await db.websiteContent.findUniqueOrThrow({
      where: { id: "main" },
    });
    await page
      .getByRole("button", {
        name: "Restore previous publication",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill(String(current.revision));
    await dialog.getByRole("button").last().click();
    await expect
      .poll(
        async () =>
          (await db.websiteContent.findUniqueOrThrow({ where: { id: "main" } }))
            .revision,
      )
      .toBeGreaterThan(current.revision);
    await invalidate(request);
    await publicPage.reload();
    await expect(publicPage.locator("html")).toHaveAttribute(
      "data-site-mode",
      expectedMode,
    );
    expect(
      (await db.websiteContent.findUniqueOrThrow({ where: { id: "main" } }))
        .draft as any,
    ).toMatchObject({ design: { defaultMode: "mixed" } });
  }
  await publicPage.close();
});

test("both languages and all tones fit compact, tablet and wide windows without hydration errors", async ({
  browser,
  request,
}) => {
  await invalidate(request);
  for (const width of [390, 768, 1440])
    for (const locale of ["en", "ar"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: width === 390,
        isMobile: width === 390,
      });
      const page = await context.newPage();
      const errors = watchErrors(page);
      await page.goto(`/${locale}/contact`);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expect(
        page.locator('a[href*="wa.me"], [data-testid="whatsapp-button"]'),
      ).toHaveCount(0);
      for (const [mode, label] of [
        ["light", locale === "ar" ? "فاتح" : "Light"],
        ["dark", locale === "ar" ? "داكن" : "Dark"],
        ["mixed", locale === "ar" ? "مختلط" : "Mixed"],
      ]) {
        await page
          .locator("footer")
          .getByRole("button", { name: label, exact: true })
          .click();
        await expect(page.locator("html")).toHaveAttribute(
          "data-site-mode",
          mode,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
      }
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: `tests/.results/redesign/contact-${locale}-${width}.png`,
        fullPage: true,
      });
      errors.assertClean();
      await context.close();
    }
});

test("saved mixed appearance scopes regions before hydration", async ({
  browser,
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  const design = defaultWebsiteDesign("dark");
  publication.config.design = {
    ...design,
    visitorSwitching: true,
    tones: { ...design.tones, header: "dark", contact: "light" },
  };
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("site-mode", "mixed"));
  await page.route("**/_next/**/*.js", (route) => route.abort());
  await page.goto("/en/contact");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "mixed");
  expect(
    await page
      .locator('[data-site-region="header"]')
      .evaluate((el) => getComputedStyle(el).colorScheme),
  ).toBe("dark");
  expect(
    await page
      .locator("main")
      .evaluate((el) => getComputedStyle(el).colorScheme),
  ).toBe("light");
  await context.close();
});

test("locked mode ignores stale storage; disabled actions fail at the server", async ({
  page,
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.design = {
    ...publication.config.design,
    defaultMode: "light",
    allowedModes: ["light"],
    visitorSwitching: false,
  };
  publication.config.commerce = {
    ...defaultWebsiteCommerce(),
    capabilities: {
      ...defaultWebsiteCommerce().capabilities,
      accounts: false,
      ordering: false,
      inquiries: false,
    },
  };
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  await page.addInitScript(() => localStorage.setItem("site-mode", "dark"));
  await page.goto("/en/contact");
  await expect(page.locator("html")).toHaveAttribute("data-site-mode", "light");
  await expect(
    page.getByRole("group", { name: "Website appearance" }),
  ).toHaveCount(0);
  const origin = { origin: "http://localhost:3013" };
  expect(
    (
      await request.post("/api/store/order", { headers: origin, data: {} })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/account/sign-up", { headers: origin, data: {} })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/reviews", { headers: origin, data: {} })
    ).status(),
  ).toBe(404);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("ordering rejects unavailable fulfillment and payment configurations", async ({
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  const previousCommerce = publication.config.commerce;
  const settings = await db.storeSettings.findUniqueOrThrow({
    where: { id: "default" },
  });
  try {
    publication.config.commerce = {
      ...defaultWebsiteCommerce(),
      branchSelectionRequired: true,
      capabilities: {
        ...defaultWebsiteCommerce().capabilities,
        delivery: false,
      },
    };
    await db.websiteContent.update({
      where: { id: "main" },
      data: { published: publication },
    });
    await invalidate(request);
    expect(
      (
        await request.post("/api/store/order", {
          headers: { origin: "http://localhost:3013" },
          data: {},
        })
      ).status(),
    ).toBe(404);
    publication.config.commerce = defaultWebsiteCommerce();
    await db.websiteContent.update({
      where: { id: "main" },
      data: { published: publication },
    });
    await invalidate(request);
    await db.storeSettings.update({
      where: { id: "default" },
      data: {
        codEnabled: false,
        bankTransferEnabled: false,
        paymentGateway: null,
      },
    });
    expect(
      (
        await request.post("/api/store/order", {
          headers: { origin: "http://localhost:3013" },
          data: {},
        })
      ).status(),
    ).toBe(404);
  } finally {
    await db.storeSettings.update({
      where: { id: "default" },
      data: {
        codEnabled: settings.codEnabled,
        bankTransferEnabled: settings.bankTransferEnabled,
        paymentGateway: settings.paymentGateway,
      },
    });
    publication.config.commerce = previousCommerce;
    await db.websiteContent.update({
      where: { id: "main" },
      data: { published: publication },
    });
    await invalidate(request);
  }
});

test("pickup rejects missing/inactive branches and keeps a server-created historical snapshot", async ({
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.commerce = {
    ...defaultWebsiteCommerce(),
    branches: [branch],
  };
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  const product = await freshStockedProduct(db, {
    sku: "REDESIGN-PICKUP",
    nameEn: "Pickup test",
    nameAr: "اختبار الاستلام",
    price: 12.5,
    onHand: 5,
  });
  const data = {
    fulfilment: "pickup",
    lines: [{ productId: product.id, quantity: 1 }],
    name: "Pickup Test",
    email: "pickup@example.test",
    phone: "+973 3600 0011",
    paymentMethod: "cod",
    locale: "en",
  };
  const headers = { origin: "http://localhost:3013" };
  expect(
    (await request.post("/api/store/order", { headers, data })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/store/order", {
        headers,
        data: { ...data, pickupBranchId: "unknown" },
      })
    ).status(),
  ).toBe(400);
  const response = await request.post("/api/store/order", {
    headers,
    data: {
      ...data,
      pickupBranchId: branch.id,
      total: 0,
      pickupBranch: { nameEn: "tampered" },
    },
  });
  expect(response.status()).toBe(200);
  const number = (await response.json()).number;
  const order = await db.salesOrder.findUniqueOrThrow({ where: { number } });
  expect(Number(order.total)).toBeGreaterThanOrEqual(12.5);
  expect((order.shippingAddress as any).pickupBranch).toEqual(branch);
  expect(await stockOf(db, product.id)).toEqual({ onHand: 5, reserved: 1 });
  publication.config.commerce.branches[0].active = false;
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  expect(
    (
      await request.post("/api/store/order", {
        headers,
        data: { ...data, pickupBranchId: branch.id },
      })
    ).status(),
  ).toBe(400);
  expect(
    (await db.salesOrder.findUniqueOrThrow({ where: { number } }))
      .shippingAddress,
  ).toEqual(order.shippingAddress);
});

test("customers see only their own order and private files; evidence never marks it paid", async ({
  browser,
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.commerce = { ...defaultWebsiteCommerce(), branches: [] };
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  const contexts = [];
  for (const name of ["a", "b"]) {
    const customer = await db.customer.upsert({
      where: { email: `redesign-${name}@example.test` },
      update: {},
      create: {
        email: `redesign-${name}@example.test`,
        name: `Customer ${name}`,
        locale: "en",
      },
    });
    const token = randomBytes(32).toString("hex");
    await db.customerSession.create({
      data: {
        customerId: customer.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "platform_customer",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    contexts.push({ customer, context });
  }
  const [a, b] = contexts;
  const order = await db.salesOrder.findFirstOrThrow({
    where: { lines: { some: { sku: "REDESIGN-PICKUP" } } },
    orderBy: { placedAt: "desc" },
  });
  await db.salesOrder.update({
    where: { id: order.id },
    data: {
      customerId: a.customer.id,
      paymentMethod: "bank_transfer",
      paymentStatus: "unpaid",
    },
  });
  const url = `/en/account/orders/${order.id}`;
  expect(
    (await a.context.request.get(`http://localhost:3013${url}`)).status(),
  ).toBe(200);
  expect(
    (await b.context.request.get(`http://localhost:3013${url}`)).status(),
  ).toBe(404);
  const attachmentUrl = `http://localhost:3013/api/account/orders/${order.id}/attachments`;
  const headers = {
    origin: "http://localhost:3013",
    "x-file-name": "payment-evidence.pdf",
    "Content-Type": "application/pdf",
  };
  expect(
    (
      await b.context.request.post(attachmentUrl, {
        headers,
        data: Buffer.from("%PDF-1.4\nfixture"),
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await a.context.request.post(attachmentUrl, {
        headers,
        data: Buffer.from("spoofed PDF"),
      })
    ).status(),
  ).toBe(415);
  const uploaded = await a.context.request.post(attachmentUrl, {
    headers,
    data: Buffer.from("%PDF-1.4\nfixture"),
  });
  expect(uploaded.status()).toBe(201);
  const attachment = await db.attachment.findUniqueOrThrow({
    where: { id: (await uploaded.json()).id },
  });
  expect(
    (await db.salesOrder.findUniqueOrThrow({ where: { id: order.id } }))
      .paymentStatus,
  ).toBe("unpaid");
  expect(
    (await a.context.request.get(`${attachmentUrl}/${attachment.id}`)).status(),
  ).toBe(200);
  expect(
    (await b.context.request.get(`${attachmentUrl}/${attachment.id}`)).status(),
  ).toBe(404);
  expect(
    (await request.get(`${attachmentUrl}/${attachment.id}`)).status(),
  ).toBe(401);
  expect((await request.get(attachment.fileUrl)).status()).toBe(404);
  for (const { context } of contexts) await context.close();
});

test("public PDF uploads stay unlisted until publication and obey download restrictions", async ({
  request,
}) => {
  const adminUrl = "http://localhost:3012";
  const login = await request.post(`${adminUrl}/api/auth/login`, {
    headers: { origin: adminUrl },
    data: { email: admin.email, password: admin.password },
  });
  expect(login.status()).toBe(200);
  const bytes = Buffer.from("%PDF-1.4\npublic specification");
  const init = await request.post(`${adminUrl}/api/upload/init`, {
    data: {
      entityType: "cms_document",
      entityId: "portfolio",
      fileName: "public-specification.pdf",
      fileType: "application/pdf",
      fileSize: bytes.length,
    },
  });
  expect(init.status()).toBe(200);
  const upload = await init.json();
  expect(
    (
      await request.put(`${adminUrl}${upload.signedUrl}`, {
        headers: { "Content-Type": "application/pdf" },
        data: bytes,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`${adminUrl}/api/upload/finalize`, {
        data: {
          fileUrl: upload.fileUrl,
          entityType: "cms_document",
          entityId: "portfolio",
        },
      })
    ).status(),
  ).toBe(200);
  expect((await request.get(upload.fileUrl)).status()).toBe(404);
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.documents = [
    {
      titleEn: "Specification",
      titleAr: "المواصفات",
      itemSlug: "",
      url: upload.fileUrl,
    },
  ];
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  const published = await request.get(upload.fileUrl);
  expect(published.status()).toBe(200);
  expect(published.headers()["content-disposition"]).toContain("attachment");
  publication.config.commerce.capabilities.downloads = false;
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  expect((await request.get(upload.fileUrl)).status()).toBe(404);
});

test("inquiry references upload after success and remain private to authorized staff", async ({
  page,
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.commerce = defaultWebsiteCommerce();
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  await page.goto("/en/contact");
  await page.locator('[name="fullName"]').fill("Reference upload test");
  await page.locator('[name="email"]').fill("redesign-inquiry@example.test");
  await page
    .locator('[name="message"]')
    .fill("Please review the attached project reference.");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/inquiry") && r.request().method() === "POST",
  );
  await page.locator('form button[type="submit"]').click();
  const result = await (await response).json();
  expect(result.uploadToken).toBeTruthy();
  await page
    .getByLabel("Attach an optional reference (PDF or image)")
    .setInputFiles({
      name: "reference.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nprivate reference"),
    });
  await page.getByRole("button", { name: "Attach file", exact: true }).click();
  await expect(
    page.getByText("File attached to your request.", { exact: true }),
  ).toBeVisible();
  const inquiry = await db.inquiry.findFirstOrThrow({
    where: { email: "redesign-inquiry@example.test" },
    orderBy: { createdAt: "desc" },
  });
  const attachment = await db.attachment.findFirstOrThrow({
    where: { entityType: "inquiry", entityId: inquiry.id },
  });
  expect((await request.get(attachment.fileUrl)).status()).toBe(404);
  const adminUrl = "http://localhost:3012";
  expect(
    (
      await request.get(
        `${adminUrl}${new URL(attachment.fileUrl, adminUrl).pathname}`,
      )
    ).status(),
  ).toBe(401);
  await request.post(`${adminUrl}/api/auth/login`, {
    headers: { origin: adminUrl },
    data: { email: admin.email, password: admin.password },
  });
  expect(
    (
      await request.get(
        `${adminUrl}${new URL(attachment.fileUrl, adminUrl).pathname}`,
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/inquiry/attachments", {
        headers: {
          origin: "http://localhost:3013",
          "x-inquiry-upload-token": `${result.uploadToken}x`,
        },
        data: Buffer.from("%PDF-1.4\nforged"),
      })
    ).status(),
  ).toBe(404);
});

test("pickup staff actions preserve the branch after it is disabled", async ({
  page,
}) => {
  const order = await db.salesOrder.findFirstOrThrow({
    where: { lines: { some: { sku: "REDESIGN-PICKUP" } } },
    orderBy: { placedAt: "desc" },
  });
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  await page.goto("http://localhost:3012/login");
  await page.locator('input[type="email"]:visible').fill(admin.email);
  await page.locator('input[type="password"]:visible').fill(admin.password);
  await page.locator('button[type="submit"]:visible').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 60_000 });
  await page.goto(`http://localhost:3012/dashboard/orders/${order.id}`);
  await expect(
    page.locator("#admin-main").getByText(branch.nameEn, { exact: true }),
  ).toBeVisible();
  for (const status of ["packing", "shipped", "delivered"]) {
    const button = page
      .getByTestId(`order-move-${status}`)
      .filter({ visible: true });
    if (status === "shipped")
      await expect(button).toHaveText("Ready for collection");
    if (status === "delivered")
      await expect(button).toHaveText("Mark collected");
    await button.click();
    const dialog = page.getByRole("dialog");
    await dialog
      .waitFor({ state: "visible", timeout: 1000 })
      .catch(() => undefined);
    if (await dialog.isVisible())
      await dialog.getByRole("button").last().click();
    await expect
      .poll(
        async () =>
          (await db.salesOrder.findUniqueOrThrow({ where: { id: order.id } }))
            .status,
      )
      .toBe(status);
  }
  expect(
    (await db.salesOrder.findUniqueOrThrow({ where: { id: order.id } }))
      .shippingAddress,
  ).toEqual(order.shippingAddress);
});

test("scheduled offers, URL discovery, custom popup palettes and quote retry work", async ({
  page,
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.design = {
    ...defaultWebsiteDesign(),
    ...publication.config.design,
    defaultMode: "mixed",
    allowedModes: ["light", "dark", "mixed"],
    visitorSwitching: true,
    mixedBase: "dark",
    tones: {
      ...(publication.config.design?.tones ?? defaultWebsiteDesign().tones),
      collection: "light",
    },
  };
  publication.config.commerce = {
    ...defaultWebsiteCommerce(),
    facetLabels: ["Size"],
  };
  publication.portfolio[0].attributes = [
    { labelEn: "Size", labelAr: "الحجم", valueEn: "Large", valueAr: "كبير" },
  ];
  const promo = {
    titleEn: "Published offer",
    titleAr: "عرض منشور",
    textEn: "Real offer conditions",
    textAr: "شروط العرض",
    labelEn: "",
    labelAr: "",
    url: "",
    imageUrl: "",
    placement: "catalogue",
    category: "",
    couponCode: "",
    startsAt: "",
    endsAt: "",
  };
  publication.config.promotions = [
    promo,
    { ...promo, titleEn: "Expired offer", endsAt: "2020-01-01T00:00:00Z" },
    { ...promo, titleEn: "Unavailable coupon", couponCode: "NONEXISTENT" },
  ];
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  const errors = watchErrors(page);
  await page.goto(`/en/${publication.config.collection.slug}`);
  await expect(
    page.getByRole("heading", { name: "Published offer" }),
  ).toBeVisible();
  await expect(page.getByText("Expired offer", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Unavailable coupon", { exact: true }),
  ).toHaveCount(0);
  const sort = page.getByRole("combobox", { name: "Sort by", exact: true });
  await sort.click();
  const popup = page.locator("[data-select-popup]");
  await expect(popup).toBeVisible();
  expect(
    await popup.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--md-sys-color-surface"),
    ),
  ).toBe(
    await sort.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--md-sys-color-surface"),
    ),
  );
  expect(await popup.evaluate((el) => getComputedStyle(el).colorScheme)).toBe(
    await sort.evaluate((el) => getComputedStyle(el).colorScheme),
  );
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("option", { name: "Name", exact: true }).click();
  await expect(page).toHaveURL(/sort=name/);
  await page.getByRole("combobox", { name: "Size", exact: true }).click();
  await page.getByRole("option", { name: "Large", exact: true }).click();
  await expect(page).toHaveURL(/filter-Size=Large/);
  await page
    .locator("main")
    .getByLabel("Search catalogue")
    .fill("nothing-matches-this-query");
  await page
    .locator("main")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await expect(
    page.getByText("No results. Try another search or category.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("status").filter({ hasText: "1 results" }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  const product = await freshStockedProduct(db, {
    sku: "REDESIGN-RETRY",
    nameEn: "Retry item",
    nameAr: "صنف إعادة المحاولة",
    price: 2,
    onHand: 3,
  });
  await page.evaluate(
    (id) =>
      localStorage.setItem(
        "platform-cart",
        JSON.stringify([{ productId: id, quantity: 1 }]),
      ),
    product.id,
  );
  let fail = true;
  await page.route("**/api/store/quote", (route) =>
    fail
      ? route.fulfill({ status: 503, json: { error: "unavailable" } })
      : route.continue(),
  );
  await page.goto("/en/cart");
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByTestId("cart-lines")).toContainText("Retry item");
  expect(
    errors.errors.filter(
      (error) =>
        !/^console: Failed to load resource:.*503.*\(http:\/\/localhost:3013\/api\/store\/quote\)$/.test(
          error,
        ),
    ),
  ).toEqual([]);
});

test("restaurant and construction compositions render localized editable catalogue pages", async ({
  page,
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  const recipes = [...INDUSTRY_PAGES.food, ...INDUSTRY_PAGES.construction];
  for (const recipe of recipes) {
    let id = 0;
    const blocks = industryPageBlocks(
      recipe,
      () => `block-${id++}`,
      recipe.slug === "menu-guide" || recipe.slug === "restaurant"
        ? "product"
        : "case",
    );
    if (recipe.slug === "menu-guide")
      for (const block of blocks)
        if (block.type === "catalogue") (block.data as any).layout = "list";
    publication.pages.push({
      id: `redesign-${recipe.slug}`,
      slug: recipe.slug,
      page_type: "custom",
      title_en: recipe.en,
      title_ar: recipe.ar,
      seo_title_en: "",
      seo_title_ar: "",
      seo_description_en: "",
      seo_description_ar: "",
      is_visible: true,
      in_header: false,
      in_footer: false,
      sort_order: 100,
      blocks: [
        {
          id: "heading",
          type: "hero",
          visible: true,
          data: {
            ...newBlockData("hero"),
            title: { en: recipe.en, ar: recipe.ar },
            style: "centered",
          },
        },
        ...blocks,
      ],
    });
  }
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  for (const recipe of recipes)
    for (const locale of ["en", "ar"]) {
      const errors = watchErrors(page);
      await page.goto(`/${locale}/${recipe.slug}`);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: locale === "ar" ? recipe.ar : recipe.en,
        }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("link", {
            name: locale === "ar" ? "اتصل بنا" : "Contact us",
            exact: true,
          })
          .first(),
      ).toHaveAttribute("href", `/${locale}/contact`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      errors.assertClean();
    }
});

test("manual address coordinates are validated and kept on the order", async ({
  page,
  request,
  context,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.commerce = {
    ...defaultWebsiteCommerce(),
    collectCoordinates: true,
    orderLayout: "stacked",
  };
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  const product = await freshStockedProduct(db, {
    sku: "REDESIGN-PIN",
    nameEn: "Pin item",
    nameAr: "صنف تحديد الموقع",
    price: 8,
    onHand: 4,
  });
  const data = {
    fulfilment: "delivery",
    lines: [{ productId: product.id, quantity: 1 }],
    name: "Pin Test",
    email: "pin@example.test",
    phone: "+973 3600 0012",
    paymentMethod: "cod",
    locale: "en",
    address: {
      name: "Pin Test",
      phone: "+973 3600 0012",
      line1: "Road 3",
      city: "Manama",
      country: "Bahrain",
      latitude: 91,
      longitude: 50.5,
    },
  };
  expect(
    (
      await request.post("/api/store/order", {
        headers: { origin: "http://localhost:3013" },
        data,
      })
    ).status(),
  ).toBe(400);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 26.23, longitude: 50.54 });
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        "platform-cart",
        JSON.stringify([{ productId: id, quantity: 1 }]),
      ),
    product.id,
  );
  await page.goto("/en/checkout");
  const form = page.getByTestId("checkout-form");
  await form.locator('[name="name"]').fill("Pin Test");
  await form.locator('[name="email"]').fill("pin@example.test");
  await form.locator('[name="phone"]').fill("+973 3600 0012");
  for (const [key, value] of Object.entries({
    name: "Pin Test",
    phone: "+973 3600 0012",
    line1: "Road 3",
    city: "Manama",
    country: "Bahrain",
  }))
    await form.locator(`[name="shipping-${key}"]`).fill(value);
  await page
    .getByRole("button", { name: "Use device location", exact: true })
    .click();
  await expect(page.getByLabel("Latitude", { exact: true })).toHaveValue(
    "26.23",
  );
  await page.getByTestId("checkout-place").click();
  await expect(page.getByTestId("order-placed")).toBeVisible();
  const order = await db.salesOrder.findFirstOrThrow({
    where: { lines: { some: { productId: product.id } } },
    orderBy: { placedAt: "desc" },
  });
  expect(order.shippingAddress).toMatchObject({
    latitude: 26.23,
    longitude: 50.54,
    line1: "Road 3",
  });
});

test("palette changes remain in signed preview until the next publication", async ({
  page,
  request,
  browser,
}) => {
  await page.goto("/en/contact");
  const before = await page.locator("#company-theme").textContent();
  await db.companySetting.update({
    where: { singleton: 1 },
    data: { theme: { ...(originalBrand.theme as object), primary: "#8844CC" } },
  });
  await invalidate(request);
  await page.reload();
  expect(await page.locator("#company-theme").textContent()).toBe(before);
  const expires = String(Date.now() + 600_000);
  const token = createHmac("sha256", process.env.REVALIDATION_SECRET!)
    .update(`website-preview:${expires}`)
    .digest("hex");
  const preview = await browser.newContext();
  const previewPage = await preview.newPage();
  await previewPage.goto(
    `/api/preview?expires=${expires}&token=${token}&locale=en&path=/en/contact`,
  );
  expect(await previewPage.locator("#company-theme").textContent()).not.toBe(
    before,
  );
  expect(
    (
      await preview.request.post("http://localhost:3013/api/store/order", {
        headers: { origin: "http://localhost:3013" },
        data: {},
      })
    ).status(),
  ).toBe(404);
  await preview.close();
});

test("long menus, legal dialogs and account tabs retain keyboard focus and scoped themes", async ({
  page,
  request,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  publication.config.menus = { header: [], footer: [] };
  publication.config.menus.header = Array.from({ length: 14 }, (_, i) => ({
    kind: "external",
    url: `https://example.test/page-${i}`,
    labelEn: `Department ${i} — Longer mixed language navigation اسم القسم`,
    labelAr: `القسم ${i} — عنوان طويل باللغتين Department name`,
  }));
  await db.websiteContent.update({
    where: { id: "main" },
    data: { published: publication },
  });
  await invalidate(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/contact");
  const opener = page.getByRole("button", { name: "Open menu", exact: true });
  await opener.click();
  const menu = page.getByRole("dialog", {
    name: "Navigation menu",
    exact: true,
  });
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(opener).toBeFocused();
  const legal = page.getByRole("button", {
    name: "Privacy & Security",
    exact: true,
  });
  await legal.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(legal).toBeFocused();
  await page.goto("/en/account");
  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.last()).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
});

test("an industry page preset can be customized, saved, reloaded and privately previewed", async ({
  page,
  context,
}) => {
  await db.cmsPage.deleteMany({ where: { slug: "redesign-restaurant" } });
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  await page.goto("http://localhost:3012/login");
  await page.locator('input[type="email"]:visible').fill(admin.email);
  await page.locator('input[type="password"]:visible').fill(admin.password);
  await page.locator('button[type="submit"]:visible').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 60_000 });
  await page.goto("http://localhost:3012/dashboard/cms/pages/new");
  await page
    .getByRole("combobox", { name: "Business activity", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Restaurant & café", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply to blank page", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply to blank page", exact: true }),
  ).toBeDisabled();
  const title = page.getByLabel(/^Page title.*English/i);
  await title.fill("Restaurant page from CMS");
  await page.getByLabel("Address", { exact: true }).fill("redesign-restaurant");
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/cms\/pages\/(?!new)[a-z0-9-]+$/, {
    timeout: 60_000,
  });
  await page.reload();
  await expect(page.getByLabel(/^Page title.*English/i)).toHaveValue(
    "Restaurant page from CMS",
  );
  const saved = await db.cmsPage.findUniqueOrThrow({
    where: { slug: "redesign-restaurant" },
  });
  expect(saved.isVisible).toBe(false);
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = await popup;
  await expect(
    preview.getByRole("heading", {
      name: "Restaurant page from CMS",
      level: 1,
    }),
  ).toBeVisible();
  await preview.close();
});

test("article sharing offers a selectable URL when clipboard access is denied", async ({
  page,
}) => {
  const row = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const publication = row.published as any;
  const article = publication.articles[0];
  test.skip(!article, "The test profile has no published article.");
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Clipboard denied by test");
        },
      },
    }),
  );
  await page.goto(
    `/en/${publication.config.articles?.slug ?? "news"}/${article.slug}`,
  );
  await page.getByRole("button", { name: /Copy link/i }).click();
  await expect(page.getByRole("textbox", { name: /Copy link/i })).toBeFocused();
  await expect(page.getByRole("textbox", { name: /Copy link/i })).toHaveValue(
    new RegExp(article.slug),
  );
});

for (const width of [390, 768, 1440])
  for (const locale of ["en", "ar"])
    test(`public route sweep ${locale} at ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: width === 390,
        isMobile: width === 390,
      });
      const page = await context.newPage();
      const errors = watchErrors(page);
      const row = await db.websiteContent.findUniqueOrThrow({
        where: { id: "main" },
      });
      const config = (row.published as any).config;
      for (const path of [
        "",
        "/about",
        "/contact",
        `/${config.collection?.slug ?? "works"}`,
        `/${config.articles?.slug ?? "news"}`,
        "/press",
        "/account",
        "/cart",
        "/checkout",
      ]) {
        const response = await page.goto(`/${locale}${path}`);
        expect(response!.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute(
          "dir",
          locale === "ar" ? "rtl" : "ltr",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
          path,
        ).toBeLessThanOrEqual(1);
        await page.screenshot({
          path: `tests/.results/redesign/routes/${locale}-${width}-${path.replaceAll("/", "") || "home"}.png`,
          fullPage: true,
        });
      }
      errors.assertClean();
      await context.close();
    });
