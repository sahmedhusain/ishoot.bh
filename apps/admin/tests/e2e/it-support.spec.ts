import { expect, test } from "@playwright/test";
import { TICKET_CATEGORIES, ticketCategory } from "@platform/contracts";
import { watchErrors } from "./helpers/helpers";
import { selectOption } from "./helpers/select-option";
import { t } from "./helpers/locale";

const s = t.itSupport;
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test("an employee raises, follows and cancels an IT request", async ({
  page,
}) => {
  const watch = watchErrors(page);
  const title = `E2E laptop ${Date.now()}`;
  const category = TICKET_CATEGORIES.find((c) => c.linksAsset)!;

  await page.goto("/dashboard/it-support");
  await expect(page.getByText(s.unavailable)).toHaveCount(0);
  await page.getByRole("link", { name: s.newTicket }).click();
  await expect(page).toHaveURL(/\/dashboard\/it-support\/new$/);

  await selectOption(page.locator("#ticket-category"), category.key);
  await selectOption(
    page.locator("#ticket-subcategory"),
    category.subcategories[1].key,
  );
  await selectOption(page.locator("#ticket-priority"), "high");
  await page.locator("#ticket-title").fill(title);
  await page
    .locator("#ticket-description")
    .fill("The screen stays black after the update.");
  await page.locator("#ticket-asset").fill("LAP-E2E-1");
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "error.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
  await expect(page.getByText("error.pdf")).toBeVisible();
  await page.getByRole("button", { name: s.submit }).click();

  await expect(page).toHaveURL(/\/dashboard\/it-support\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(s.statuses.new, { exact: true })).toBeVisible();
  await expect(
    page.getByText(s.priorities.high, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(ticketCategory(category.key)!.nameAr),
  ).toBeVisible();
  await expect(page.getByText("LAP-E2E-1")).toBeVisible();

  const attachment = page.getByRole("link", { name: "error.pdf" });
  const response = await page.request.get(
    (await attachment.getAttribute("href"))!,
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");

  await page
    .getByLabel(s.commentPlaceholder)
    .fill("Serial number is on the back.");
  await page.getByRole("button", { name: s.sendComment }).click();
  await expect(page.getByText("Serial number is on the back.")).toBeVisible();

  await page.getByRole("button", { name: s.transitions.cancel }).click();
  await expect(
    page.getByText(s.statuses.cancelled, { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText(s.closedNoComments)).toBeVisible();

  await page.goto("/dashboard/it-support");
  await expect(
    page.getByRole("link", { name: new RegExp(title) }),
  ).toBeVisible();
  watch.assertClean();
});
