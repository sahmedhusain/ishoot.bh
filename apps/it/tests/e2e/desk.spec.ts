import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createTicket } from "@platform/api-client";
import { ports } from "../../playwright.config";
import t from "@platform/locales/ar.json";
import { watchErrors } from "./helpers/helpers";
import { totp } from "../../totp";

const accountFile = path.resolve(
  process.env.E2E_IT_ACCOUNT_FILE ||
    path.join(__dirname, "../../.results/it-account.json"),
);

test.describe.configure({ mode: "serial" });

test("IT works a ticket from the desk", async ({ page, browser }) => {

  test.slow();
  test.skip(
    !fs.existsSync(accountFile),
    "run node tests/e2e/it-account.cjs first",
  );
  require("dotenv").config({
    path: path.resolve(__dirname, "../../../../.env"),
    quiet: true,
  });
  const account = JSON.parse(fs.readFileSync(accountFile, "utf8")) as {
    email: string;
    password: string;
    secret: string;
  };
  const title = `E2E printer ${Date.now()}`;
  await createTicket({
    requesterId: "e2e-employee",
    requesterName: "E2E Employee",
    requesterEmail: "e2e-employee@example.test",
    category: "hardware",
    subcategory: "peripheral",
    title,
    description: "The printer on the second floor jams.",
  });
  const watch = watchErrors(page);

  await page.goto("/login");
  await page.getByLabel(t.login.email).fill(account.email);
  await page.getByLabel(t.login.password).fill(account.password);
  await page.getByRole("button", { name: t.login.submit }).click();
  await page.getByLabel(t.login.otp).fill(totp(account.secret));
  await page.getByRole("button", { name: t.login.verify }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: t.overview.title }),
  ).toBeVisible();
  await expect(page.getByText(account.email)).toBeVisible();
  await expect(page.getByText(t.overview.open, { exact: true })).toBeVisible();
  await expect(page.getByText(t.overview.unavailable)).toHaveCount(0);

  await page.getByRole("link", { name: t.nav.tickets }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(
    page.getByRole("heading", { name: t.tickets.title }),
  ).toBeVisible();
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("e2e-employee@example.test")).toBeVisible();

  await page.getByRole("button", { name: t.tickets.assignToMe }).click();
  await expect(
    page.getByText(t.statuses.assigned, { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: t.tickets.assignToMe }),
  ).toHaveCount(0);

  await page.getByRole("radio", { name: t.tickets.note }).click();
  await page.getByLabel(t.tickets.note).fill("Toner order placed.");
  await page.getByRole("button", { name: t.tickets.send }).click();
  await expect(page.getByText("Toner order placed.")).toBeVisible();

  await page.getByRole("button", { name: t.transitions.start }).click();
  await expect(
    page.getByText(t.statuses.in_progress, { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: t.transitions.resolve }).click();
  await expect(
    page.getByText(t.statuses.resolved, { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: t.nav.sla }).click();
  const response = page.getByLabel(`${t.priorities.low} ${t.sla.response}`);
  const resolve = page.getByLabel(`${t.priorities.low} ${t.sla.resolve}`);
  const before = await response.inputValue();
  await response.fill("2000");
  await resolve.fill("1000");
  await page
    .getByRole("row", { name: new RegExp(t.priorities.low) })
    .getByRole("button", { name: t.sla.save })
    .click();
  await expect(page.getByText(t.sla.failed)).toBeVisible();
  await response.fill(String(Number(before) + 1));
  await resolve.fill("10080");
  await page
    .getByRole("row", { name: new RegExp(t.priorities.low) })
    .getByRole("button", { name: t.sla.save })
    .click();
  await expect(page.getByText(t.sla.saved)).toBeVisible();
  await expect(response).toHaveValue(String(Number(before) + 1));

  await page.getByRole("link", { name: t.nav.modules }).click();
  const reviews = page.getByRole("switch", { name: "تقييمات العملاء" });
  const wasOn = (await reviews.getAttribute("aria-checked")) === "true";
  await reviews.click();
  await expect(page.getByText(t.modules.saved).first()).toBeVisible();
  await expect(reviews).toHaveAttribute("aria-checked", String(!wasOn));
  await reviews.click();
  await expect(reviews).toHaveAttribute("aria-checked", String(wasOn));

  await page.getByRole("link", { name: t.nav.integrations }).click();
  await expect(page).toHaveURL(/\/integrations$/);
  await expect(
    page.getByRole("heading", { name: t.integrations.title }),
  ).toBeVisible();
  await expect(page.getByTestId("integration-resend")).toBeVisible();
  await expect(page.getByTestId("integration-stripe")).toBeVisible();

  await page.getByRole("link", { name: t.nav.site }).click();
  await expect(page.getByRole("heading", { name: t.site.title })).toBeVisible();
  const websiteDomain = page.getByLabel(t.site.domains.websiteLabel);
  const adminDomain = page.getByLabel(t.site.domains.adminLabel);
  const saveDomains = page.getByRole("button", { name: t.site.domains.save });
  await websiteDomain.fill("e2e-site.example.com");
  await adminDomain.fill("e2e-site.example.com");
  await saveDomains.click();
  await expect(page.getByText(t.site.domainsMustDiffer)).toBeVisible();
  await adminDomain.fill("https://E2E-Admin.example.com/login");
  await saveDomains.click();
  await expect(page.getByText(t.site.domains.saved)).toBeVisible();
  await expect(adminDomain).toHaveValue("e2e-admin.example.com");
  await expect(page.getByText("e2e-site.example.com").first()).toBeVisible();

  const analytics = page.getByLabel(t.site.code.googleAnalyticsId);
  const head = page.getByLabel(t.site.code.headHtml);
  const saveCode = page.getByRole("button", { name: t.site.code.save });
  await analytics.fill("UA-123");
  await saveCode.click();
  await expect(page.getByText(t.site.failed)).toBeVisible();
  await analytics.fill("G-E2E12345");
  await head.fill('<meta name="e2e-site-code">');
  await saveCode.click();
  await expect(page.getByText(t.site.code.saved)).toBeVisible();
  const site = await page.request.get(`http://localhost:${ports.web}/en`);
  const html = await site.text();
  expect(html).toContain("G-E2E12345");
  expect(html).toContain("e2e-site-code");

  await analytics.fill("");
  await head.fill("");
  await saveCode.click();
  await expect(page.getByText(t.site.code.saved).first()).toBeVisible();
  await websiteDomain.fill("");
  await adminDomain.fill("");
  await saveDomains.click();
  await expect(page.getByText(t.site.domains.saved).first()).toBeVisible();

  const stamp = Date.now();
  const testEmail = `it-test-${stamp}@example.test`;
  const testPhone = `9733${String(stamp).slice(-6)}1`;
  await page.getByRole("link", { name: t.nav.notifications }).click();
  await expect(
    page.getByRole("heading", { name: t.notifications.title }),
  ).toBeVisible();
  const to = page.getByLabel(t.notifications.testTo);
  const sendTest = page.getByRole("button", { name: t.notifications.sendTest });
  await to.fill(testEmail);
  await sendTest.click();
  await expect(
    page.getByText(t.notifications.testQueued).first(),
  ).toBeVisible();
  await page.getByLabel(t.notifications.channel).selectOption("whatsapp");
  await to.fill(`+${testPhone}`);
  await sendTest.click();
  await expect(
    page.getByText(t.notifications.testQueued).first(),
  ).toBeVisible();

  await page.getByLabel(t.notifications.channel).selectOption("whatsapp");
  await to.fill("+97333000400");
  await sendTest.click();
  const messages = page.getByRole("list", { name: t.notifications.title });
  await expect(async () => {
    await page.reload();
    await expect(
      messages.getByRole("listitem").filter({ hasText: "97333000400" }).first(),
    ).toContainText(t.notifications.statuses.failed, { timeout: 2_000 });
    await expect(
      messages.getByRole("listitem").filter({ hasText: testEmail }),
    ).toContainText(t.notifications.statuses.sent, { timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
  const refused = messages
    .getByRole("listitem")
    .filter({ hasText: "97333000400" })
    .first();
  await expect(refused).toContainText(
    "recipient phone number not in allowed list",
  );
  await expect(
    refused.getByRole("button", { name: t.notifications.retry }),
  ).toBeVisible();
  const mailpit = await page.request.get(
    `http://127.0.0.1:${process.env.MAILPIT_UI_PORT ?? "8025"}/api/v1/search?query=${encodeURIComponent(`to:${testEmail}`)}`,
  );
  expect((await mailpit.json()).messages_count).toBe(1);
  const sandbox = await page.request.get(
    `http://127.0.0.1:${process.env.WHATSAPP_SANDBOX_PORT ?? "8095"}/sandbox/messages?to=${testPhone}`,
  );
  await expect(async () => {
    const res = await page.request.get(sandbox.url());
    expect((await res.json()).items).toHaveLength(1);
  }).toPass({ timeout: 30_000 });

  await page.getByRole("link", { name: t.nav.audit }).click();
  await expect(
    page.getByRole("heading", { name: t.audit.title }),
  ).toBeVisible();
  const domainsChanged = t.audit.subjects["system.site_domains.changed"];
  const events = page.getByRole("list", { name: t.audit.title });
  await expect(async () => {
    await page.reload();
    await expect(events.getByText(domainsChanged).first()).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 30_000 });
  await page
    .getByLabel(t.audit.subject)
    .selectOption("system.site_code.changed");
  await page.getByRole("button", { name: t.audit.apply }).click();
  await expect(page).toHaveURL(/subject=system\.site_code\.changed/);
  const entry = events.getByRole("listitem").first();
  await entry.getByText(t.audit.subjects["system.site_code.changed"]).click();
  await expect(entry.getByText(/"changedBy": "it:/)).toBeVisible();
  await expect(events.getByText(domainsChanged)).toHaveCount(0);

  await page.getByLabel(t.audit.subject).selectOption("notify.message.failed");
  await page.getByRole("button", { name: t.audit.apply }).click();
  await expect(page).toHaveURL(/subject=notify\.message\.failed/);
  await expect(
    events.getByText(t.audit.subjects["notify.message.failed"]).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: t.nav.itAccounts }).click();
  await expect(
    page.getByRole("heading", { name: t.itAccounts.title, exact: true }),
  ).toBeVisible();
  const administrator = page.getByRole("form", {
    name: account.email,
    exact: true,
  });
  await administrator.getByLabel(t.itAccounts.active).uncheck();
  await administrator.getByRole("button", { name: t.itAccounts.save }).click();
  await expect(page.getByText(t.itAccounts.errors.lastAdmin)).toBeVisible();
  await expect(administrator.getByLabel(t.itAccounts.active)).toBeChecked();

  const newEmail = `it-account-${stamp}@example.test`;
  const newPassword = "e2e-account-password-".repeat(8);
  const create = page.getByRole("form", {
    name: t.itAccounts.create,
    exact: true,
  });
  await create.getByLabel(t.itAccounts.email).fill(newEmail);
  await create
    .getByLabel(t.itAccounts.password, { exact: true })
    .fill(newPassword);
  await create.getByRole("button", { name: t.itAccounts.create }).click();
  await expect(
    page.getByRole("heading", { name: t.itAccounts.provisioning }),
  ).toBeVisible();
  const provisioning = page
    .getByRole("status")
    .filter({ hasText: t.itAccounts.provisioning });
  const newSecret = (await provisioning.locator("code").textContent())!.trim();
  expect(newSecret).toMatch(/^[A-Z2-7]+$/);
  await provisioning
    .getByRole("button", { name: t.itAccounts.dismiss })
    .click();
  await expect(provisioning).toHaveCount(0);
  const member = page.getByRole("form", { name: newEmail, exact: true });
  await member.getByRole("combobox", { name: t.itAccounts.role }).click();
  await page
    .getByRole("option", { name: /it_engineer|IT Systems Engineer|مهندس أنظمة تقنية المعلومات/i })
    .click();
  await member.getByRole("button", { name: t.itAccounts.save }).click();
  await expect(page.getByText(t.itAccounts.saved).first()).toBeVisible();

  const guest = await browser.newContext({
    baseURL: `http://localhost:${ports.it}`,
  });
  try {
    const other = await guest.newPage();
    await other.goto("/login");
    await other.getByLabel(t.login.email).fill(newEmail);
    await other.getByLabel(t.login.password).fill(newPassword);
    await other.getByRole("button", { name: t.login.submit }).click();
    await other.getByLabel(t.login.otp).fill(totp(newSecret));
    await other.getByRole("button", { name: t.login.verify }).click();
    await expect(other).toHaveURL(/\/$/);
    await expect(
      other.getByRole("link", { name: t.nav.itAccounts }),
    ).toHaveCount(0);
    expect((await other.goto("/it-accounts"))?.status()).toBe(403);
    const access = (await guest.cookies()).find(
      (c) => c.name === (process.env.IT_ACCESS_COOKIE || "platform_it_access"),
    )!.value;
    await member.getByLabel(t.itAccounts.active).uncheck();
    await member.getByRole("button", { name: t.itAccounts.save }).click();
    await expect(member.getByLabel(t.itAccounts.active)).not.toBeChecked();
    await expect(async () => {
      const status = await other.request.get(
        `${process.env.API_URL}/v1/identity/session`,
        { headers: { Authorization: `Bearer ${access}` } },
      );
      expect(status.status()).toBe(401);
    }).toPass({ timeout: 10_000 });
  } finally {
    await guest.close();
  }

  await page.getByRole("button", { name: t.app.signOut }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/login$/);
  watch.assertClean();
});
