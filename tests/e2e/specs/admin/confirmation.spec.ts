import { expect, test } from "@playwright/test";
import { encryptIntegrationCredentials } from "../../../../packages/database/src/services/integration-credentials";
import { testDatabase } from "../../helpers";
import { t } from "../../locale";

const db = testDatabase();
const copy = t.integrations;
const provider = "youtube";

test.beforeEach(async () => {
  await db.integrationSetting.upsert({
    where: { provider },
    create: { provider, isActive: true, credentials: encryptIntegrationCredentials({ channelId: "e2e-channel", apiKey: "e2e-invalid-provider-key" }) },
    update: { isActive: true, credentials: encryptIntegrationCredentials({ channelId: "e2e-channel", apiKey: "e2e-invalid-provider-key" }) },
  });
});
test.afterAll(async () => {
  await db.integrationSetting.deleteMany({ where: { provider } });
  await db.$disconnect();
});

for (const mobile of [false, true]) {
  test(`shared confirmation traps focus, requires typed text and restores focus (${mobile ? "mobile" : "desktop"})`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dashboard/settings/integrations");
    const card = page.locator("section").filter({ has: page.getByRole("heading", { name: copy.kinds.social, exact: true }) });
    const unlink = card.locator("div").filter({ has: page.getByRole("heading", { name: copy.providers.youtube.name, exact: true }) }).filter({ has: page.getByRole("button", { name: copy.unlink, exact: true }) }).last().getByRole("button", { name: copy.unlink, exact: true });
    await unlink.click();
    const dialog = page.getByRole("dialog");
    const typed = dialog.getByRole("textbox");
    const confirm = dialog.getByRole("button", { name: copy.unlink, exact: true });
    await expect(typed).toBeFocused();
    await expect(typed).toHaveAccessibleName(new RegExp(copy.providers.youtube.name));
    await expect(dialog).toHaveAccessibleDescription(copy.unlinkBody);
    await expect(confirm).toBeDisabled();
    await typed.fill("incorrect");
    await expect(confirm).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(unlink).toBeFocused();
    expect((await db.integrationSetting.findUniqueOrThrow({ where: { provider } })).isActive).toBe(true);
    await unlink.click();
    await typed.fill(copy.providers.youtube.name);
    await confirm.focus();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button").first()).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(confirm).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(mobile ? 390 : 550);
    expect(await dialog.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    await confirm.click();
    await expect(dialog).toHaveCount(0);
    expect((await db.integrationSetting.findUniqueOrThrow({ where: { provider } })).isActive).toBe(false);
  });
}

test("failed destructive action remains open and cannot be dismissed while pending", async ({ page }) => {
  await page.goto("/dashboard/settings/integrations");
  const heading = page.getByRole("heading", { name: copy.providers.youtube.name, exact: true });
  const card = heading.locator("xpath=ancestor::div[contains(@class,'flex-col')][1]");
  await card.getByRole("button", { name: copy.unlink, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill(copy.providers.youtube.name);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/dashboard/settings/integrations", async route => {
    if (route.request().method() !== "POST") return route.continue();
    await gate;
    await route.abort("failed");
  });
  await dialog.getByRole("button", { name: copy.unlink, exact: true }).click();
  await expect(dialog).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Escape");
  await page.locator("[data-modal-backdrop]").click({ position: { x: 2, y: 2 }, force: true });
  await expect(dialog).toBeVisible();
  release();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-busy", "false");
  expect((await db.integrationSetting.findUniqueOrThrow({ where: { provider } })).isActive).toBe(true);
});
