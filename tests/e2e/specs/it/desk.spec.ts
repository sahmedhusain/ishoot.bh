import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createTicket } from "../../../../packages/api-client/src";
import { ports } from "../../../../playwright.config";
import t from "../../../../packages/locales/src/it/ar.json";
import { watchErrors } from "../../helpers";
import { totp } from "../../totp";

// An IT engineer signs in with a password and an authenticator code, works an employee's ticket from the queue,
// changes an SLA target and signs out. The account comes from tests/e2e/it-account.cjs (identity's bootstrap-it).
const accountFile = path.resolve(
  process.env.E2E_IT_ACCOUNT_FILE ||
    path.join(__dirname, "../../.results/it-account.json"),
);

test.describe.configure({ mode: "serial" });

test("IT works a ticket from the desk", async ({ page }) => {
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

  // A password alone is not enough: IT accounts always need the authenticator.
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

  // SLA targets: a resolution faster than the response is refused; a valid change is saved.
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

  // Modules: switching one off and back on (the system service records who did it).
  await page.getByRole("link", { name: t.nav.modules }).click();
  const reviews = page.getByRole("switch", { name: "تقييمات العملاء" });
  const wasOn = (await reviews.getAttribute("aria-checked")) === "true";
  await reviews.click();
  await expect(page.getByText(t.modules.saved).first()).toBeVisible();
  await expect(reviews).toHaveAttribute("aria-checked", String(!wasOn));
  await reviews.click();
  await expect(reviews).toHaveAttribute("aria-checked", String(wasOn));

  // Integrations: verifying integration cards load on the IT desk.
  await page.getByRole("link", { name: t.nav.integrations }).click();
  await expect(page).toHaveURL(/\/integrations$/);
  await expect(
    page.getByRole("heading", { name: t.integrations.title }),
  ).toBeVisible();
  await expect(page.getByTestId("integration-resend")).toBeVisible();
  await expect(page.getByTestId("integration-stripe")).toBeVisible();

  // Website: domains and site-wide code are IT's; the public website runs the code at once.
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

  // The stack is shared by every test database: put the website back as it was.
  await analytics.fill("");
  await head.fill("");
  await saveCode.click();
  await expect(page.getByText(t.site.code.saved).first()).toBeVisible();
  await websiteDomain.fill("");
  await adminDomain.fill("");
  await saveDomains.click();
  await expect(page.getByText(t.site.domains.saved).first()).toBeVisible();

  await page.getByRole("button", { name: t.app.signOut }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/login$/);
  watch.assertClean();
});
