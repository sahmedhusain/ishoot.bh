import { expect, test } from "@playwright/test";
import { testDatabase } from "./helpers/helpers";
import { t } from "./helpers/locale";

const db = testDatabase();

test.afterAll(async () => {
  await db.$disconnect();
});

test("dashboard reset uses the shared action confirmation and cancel preserves the saved layout", async ({
  page,
}) => {
  const user = await db.user.findFirstOrThrow({
    where: { email: "e2e-admin@example.test" },
  });
  await db.dashboardLayout.upsert({
    where: { userId: user.id },
    create: { userId: user.id, widgets: [{ id: "quick_actions", size: "m" }] },
    update: { widgets: [{ id: "quick_actions", size: "m" }] },
  });
  await page.goto("/dashboard");
  await page.getByRole("main").getByTestId("dashboard-customize").click();
  const reset = page.getByRole("button", {
    name: t.dashboardBoard.reset,
    exact: true,
  });
  await reset.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleDescription(
    t.dashboardBoard.resetConfirm,
  );
  await page.keyboard.press("Escape");
  await expect(reset).toBeFocused();
  expect(await db.dashboardLayout.count({ where: { userId: user.id } })).toBe(
    1,
  );
  await reset.click();
  await dialog.getByRole("button").last().click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(() => db.dashboardLayout.count({ where: { userId: user.id } }))
    .toBe(0);
});
