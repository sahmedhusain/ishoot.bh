import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { en } from "../../../../packages/locales/src";
import { testDatabase, watchErrors } from "../../helpers";

const copy = en.account;
const db = testDatabase();
const EMAIL = "e2e-customer@example.test";
const PASSWORD = "e2e-customer-password";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await db.featureToggle.upsert({
    where: { moduleKey: "store" },
    update: { isEnabled: true },
    create: {
      moduleKey: "store",
      nameEn: "Online store",
      nameAr: "المتجر الإلكتروني",
      isEnabled: true,
    },
  });
  const old = await db.customer.findMany({
    where: {
      OR: [{ email: EMAIL }, { email: { endsWith: "@deleted.invalid" } }],
    },
    select: { id: true, crmContactId: true },
  });
  await db.customer.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await db.crmContact.deleteMany({ where: { emailNorm: EMAIL } });
  await db.customerAuthCode.deleteMany({ where: { email: EMAIL } });
  await db.abuseWindow.deleteMany({
    where: { key: { startsWith: "customer-" } },
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("a customer signs up, signs in with a password and with an e-mailed code, keeps an address and a wishlist, and deletes the account", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/en/account");
  await page.getByRole("tab", { name: copy.tabs.signUp }).click();
  await page.locator('input[name="name"]').fill("Amal Test");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByTestId("account-submit").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.hello.replace("{name}", "Amal Test"),
  );
  // The new customer is a CRM contact too.
  const customer = await db.customer.findUniqueOrThrow({
    where: { email: EMAIL },
  });
  expect(customer.crmContactId).toBeTruthy();
  expect(customer.passwordHash).not.toContain(PASSWORD);

  await page.getByRole("button", { name: copy.addAddress }).click();
  const form = page.getByTestId("account-address-form");
  for (const [key, value] of [
    ["line1", "Road 1, Block 2"],
    ["city", "Manama"],
    ["country", "Bahrain"],
  ])
    await form.locator(`input[name="address-${key}"]`).fill(value);
  await form.locator('input[name="address-phone"]').fill("+973 3600 0002");
  await page.getByTestId("account-address-save").click();
  await expect(
    page.getByText("Road 1, Block 2, Manama, Bahrain"),
  ).toBeVisible();

  // The wishlist: save the first catalogue item from its own page.
  const item = await db.portfolioItem.findFirstOrThrow({
    orderBy: { displayOrder: "asc" },
  });
  const content = await db.websiteContent.findUniqueOrThrow({
    where: { id: "main" },
  });
  const slug =
    (
      content.published as {
        config?: { collection?: { slug?: string } };
      } | null
    )?.config?.collection?.slug ?? "works";
  await page.goto(`/en/${slug}/${item.slug}`);
  await page.getByTestId("wishlist-toggle").click();
  await expect(page.getByTestId("wishlist-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/en/account");
  await expect(page.getByRole("link", { name: item.titleEn })).toBeVisible();

  await page.getByTestId("account-sign-out").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.signInTitle,
  );
  errors.assertClean();

  // A wrong password is refused; the right one signs in.
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill("not-the-password");
  await page.getByTestId("account-submit").click();
  await expect(page.getByTestId("account-form").getByRole("alert")).toHaveText(
    copy.errors.wrong_password,
  );
  const later = watchErrors(page);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByTestId("account-submit").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.hello.replace("{name}", "Amal Test"),
  );
  await page.getByTestId("account-sign-out").click();

  // An e-mailed code (the test writes its own code, as the e-mail is not read here).
  await page.getByRole("tab", { name: copy.tabs.code }).click();
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.getByTestId("account-submit").click();
  await expect(page.getByTestId("account-form").getByRole("status")).toHaveText(
    copy.codeSent.replace("{email}", EMAIL),
  );
  await db.customerAuthCode.create({
    data: {
      email: EMAIL,
      codeHash: createHash("sha256")
        .update(`customer-code:${EMAIL}:424242`)
        .digest("hex"),
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  await page.locator('input[name="code"]').fill("424242");
  await page.getByTestId("account-submit").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.hello.replace("{name}", "Amal Test"),
  );
  expect(
    (await db.customer.findUniqueOrThrow({ where: { email: EMAIL } }))
      .emailVerifiedAt,
  ).not.toBeNull();

  // Deleting the account removes the personal details and signs out.
  await page.locator('input[name="confirmEmail"]').fill(EMAIL);
  await page.getByTestId("account-delete").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.signInTitle,
  );
  expect(await db.customer.findUnique({ where: { email: EMAIL } })).toBeNull();
  const deleted = await db.customer.findUniqueOrThrow({
    where: { email: `deleted-${customer.id}@deleted.invalid` },
  });
  expect(deleted.passwordHash).toBeNull();
  expect(
    await db.customerAddress.count({ where: { customerId: customer.id } }),
  ).toBe(0);
  later.assertClean();
});
