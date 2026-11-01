import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createTicket } from "../../../../packages/api-client/src";
import t from "../../../../packages/locales/src/it/ar.json";
import { watchErrors } from "../../helpers";
import { totp } from "../../totp";

// An IT engineer signs in with a password and an authenticator code, works an employee's ticket from the queue,
// changes an SLA target and signs out. The account comes from tests/e2e/it-account.cjs (identity's bootstrap-it).
const accountFile = path.resolve(__dirname, "../../.results/it-account.json");

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

  await page.getByRole("button", { name: t.app.signOut }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/login$/);
  watch.assertClean();
});
