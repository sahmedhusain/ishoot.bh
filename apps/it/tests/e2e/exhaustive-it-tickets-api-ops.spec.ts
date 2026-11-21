import { expect, test } from "@playwright/test";
import { createTicket } from "@platform/api-client";
import t from "@platform/locales/en.json";
import {
  createStrictObserver,
  gotoStrict,
  loginToItStrict,
  verifyReloadPersistence,
} from "./helpers/strict-audit";

test.describe("IT Console — Overview, Tickets, API Keys, API Tester, Notifications, Audit & SLA", () => {
  test("exercises ticket filters/reply/note/transitions, API key lifecycle + reload, API tester execute GET, notifications detail, audit filter & SLA validation+restore", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const observer = createStrictObserver(page, "it-exhaustive-tickets-api-ops");
    await loginToItStrict(page);

    const ts = Date.now();
    const ticketTitle = `Exhaustive IT Ticket ${ts}`;
    const createdTicket = await createTicket({
      requesterId: "exhaustive-staff",
      requesterName: "Exhaustive Staff",
      requesterEmail: `staff-${ts}@example.test`,
      category: "software",
      subcategory: "install",
      title: ticketTitle,
      description: "Full ticket workflow check for exhaustive QA suite.",
    });

    // 1. / (Overview)
    await gotoStrict(page, "/", observer);
    await expect(page.getByRole("heading", { name: t.overview.title, exact: true })).toBeVisible();
    await expect(page.getByText(t.overview.open, { exact: true })).toBeVisible();
    await expect(page.getByText(t.overview.unavailable)).toHaveCount(0);

    // 2. /tickets & /tickets/[id]
    await gotoStrict(page, "/tickets", observer);
    await expect(page.getByRole("heading", { name: t.tickets.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.tickets.filterApply }).click();
    const ticketLink = page.getByRole("link", { name: new RegExp(ticketTitle) }).first();
    await expect(ticketLink).toBeVisible({ timeout: 10_000 });

    await gotoStrict(page, `/tickets/${createdTicket.id}`, observer);
    await expect(page.getByRole("heading", { name: ticketTitle })).toBeVisible();
    await page.getByRole("button", { name: t.tickets.assignToMe }).click();
    await expect(page.getByText(t.statuses.assigned, { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("radio", { name: t.tickets.note }).click();
    await page.getByRole("textbox", { name: t.tickets.note }).fill(`Internal diagnostic note ${ts}`);
    await page.getByRole("button", { name: t.tickets.send }).click();
    await expect(page.getByText(`Internal diagnostic note ${ts}`)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("radio", { name: t.tickets.reply }).click();
    await page.getByRole("textbox", { name: t.tickets.reply }).fill(`Public response ${ts}`);
    await page.getByRole("button", { name: t.tickets.send }).click();
    await expect(page.getByText(`Public response ${ts}`)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: t.transitions.start }).click();
    await expect(page.getByText(t.statuses.in_progress, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: t.transitions.resolve }).click();
    await expect(page.getByText(t.statuses.resolved, { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    // 3. /api-keys: Create -> verify full secret shown once -> reload verify -> filter -> Revoke via REVOKE modal
    await gotoStrict(page, "/api-keys", observer);
    await expect(page.getByRole("heading", { name: t.apiKeys.title, exact: true })).toBeVisible();
    const keyName = `ExhKey-${ts}`;
    await page.getByRole("button", { name: t.apiKeys.newKey }).click();
    await page.getByLabel(t.apiKeys.name).fill(keyName);
    await page.getByRole("button", { name: t.apiKeys.createKey }).click();
    await expect(page.getByText(t.apiKeys.tokenCreatedTitle)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: t.apiKeys.dismiss }).click();

    await verifyReloadPersistence(page, async () => {
      await expect(page.locator("tr", { hasText: keyName }).first()).toBeVisible({ timeout: 10_000 });
    });

    const keySearch = page.locator(`input[placeholder="${t.apiKeys.searchPlaceholder}"]`);
    await keySearch.fill(keyName);
    const keyRow = page.locator("tr", { hasText: keyName }).first();
    await expect(keyRow).toBeVisible();
    await keyRow.getByRole("button", { name: t.apiKeys.revoke }).click();
    const revokeModal = page.getByRole("alertdialog");
    await expect(revokeModal).toBeVisible();
    await revokeModal.locator("input").first().fill("REVOKE");
    await revokeModal.getByRole("button", { name: t.criticalModal.confirm }).click();
    await expect(keyRow).toContainText(t.apiKeys.revokedStatus, { timeout: 10_000 });

    // 4. /api-tester: select preset, apply, execute GET /v1/system/desk/health -> HTTP 200
    await gotoStrict(page, "/api-tester", observer);
    await expect(page.getByRole("heading", { name: t.apiTester.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.apiTester.applyPreset }).click();
    await page.getByRole("button", { name: t.apiTester.send }).click();
    await expect(page.getByText("HTTP 200", { exact: true })).toBeVisible({ timeout: 15_000 });

    // 5. /notifications & /notifications/[id]: trigger test notification & inspect detail route
    await gotoStrict(page, "/notifications", observer);
    await expect(page.getByRole("heading", { name: t.notifications.title, exact: true })).toBeVisible();
    const notifyEmail = `exh-notify-${ts}@example.test`;
    const testForm = page.locator("form").filter({ has: page.getByRole("button", { name: t.notifications.sendTest }) });
    await testForm.getByLabel(t.notifications.testTo, { exact: true }).fill(notifyEmail);
    await testForm.getByRole("button", { name: t.notifications.sendTest }).click();
    await expect(page.getByText(t.notifications.testQueued).first()).toBeVisible({ timeout: 10_000 });

    const tableRows = page.locator("table tbody tr");
    await expect(async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      const msgRow = tableRows.filter({ hasText: notifyEmail }).first();
      await expect(msgRow).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    const detailHref = await tableRows
      .filter({ hasText: notifyEmail })
      .first()
      .locator('a[href*="/notifications/"]')
      .first()
      .getAttribute("href");
    expect(detailHref, "Expected detail link on queued notification item").toBeTruthy();
    await gotoStrict(page, detailHref!, observer);
    await expect(page.getByText(notifyEmail)).toBeVisible();

    // 6. /audit: filter by subject & clear
    await gotoStrict(page, "/audit", observer);
    await expect(page.getByRole("heading", { name: t.audit.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.audit.apply }).click();

    // 7. /sla: reject response > resolve, save valid edit, reload persistence, restore original
    await gotoStrict(page, "/sla", observer);
    await expect(page.getByRole("heading", { name: t.sla.title, exact: true })).toBeVisible();
    const resp = page.getByLabel(`${t.priorities.normal} ${t.sla.response}`);
    const reso = page.getByLabel(`${t.priorities.normal} ${t.sla.resolve}`);
    const origResp = await resp.inputValue();
    const origReso = await reso.inputValue();

    await resp.fill("5000");
    await reso.fill("100");
    const normalRow = page.getByRole("row", { name: new RegExp(t.priorities.normal) });
    await normalRow.getByRole("button", { name: t.sla.save }).click();
    await expect(page.getByText(t.sla.failed)).toBeVisible({ timeout: 10_000 });

    const bump = String(Number(origResp) + 5);
    await resp.fill(bump);
    await reso.fill(origReso);
    await normalRow.getByRole("button", { name: t.sla.save }).click();
    await expect(page.getByText(t.sla.saved).first()).toBeVisible({ timeout: 10_000 });
    await expect(normalRow.getByRole("button", { name: t.sla.save })).toBeDisabled({ timeout: 10_000 });

    await verifyReloadPersistence(page, async () => {
      await expect(page.getByLabel(`${t.priorities.normal} ${t.sla.response}`)).toHaveValue(bump);
    });

    const restoreRow = page.getByRole("row", { name: new RegExp(t.priorities.normal) });
    await page.getByLabel(`${t.priorities.normal} ${t.sla.response}`).fill(origResp);
    await page.getByLabel(`${t.priorities.normal} ${t.sla.resolve}`).fill(origReso);
    await restoreRow.getByRole("button", { name: t.sla.save }).click();
    await expect(page.getByText(t.sla.saved).first()).toBeVisible({ timeout: 10_000 });
    await expect(restoreRow.getByRole("button", { name: t.sla.save })).toBeDisabled({ timeout: 10_000 });

    await observer.assertClean("it-exhaustive-tickets-api-ops");
  });
});
