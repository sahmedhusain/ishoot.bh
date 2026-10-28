import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import en from "../../../../packages/locales/src/admin/en";
import ar from "../../../../packages/locales/src/admin/ar";
import users from "../../fixtures/users.json";
import { admin, login, testDatabase } from "../../helpers";

const db = testDatabase();
let contactId = "",
  notificationId = "",
  marker = "";
test.beforeEach(async () => {
  contactId = notificationId = "";
  marker = `e2e-${randomUUID()}`;
  const contact = await db.crmContact.create({
    data: { firstName: marker, companyName: marker },
  });
  contactId = contact.id;
  const actor = await db.user.findUniqueOrThrow({
    where: { email: admin.email },
  });
  const notification = await db.notification.create({
    data: {
      userId: actor.id,
      title: "E2E popup notification",
      message: "E2E unread popup fixture",
    },
  });
  notificationId = notification.id;
});
test.afterEach(async () => {
  await db.notification.deleteMany({ where: { id: notificationId } });
  await db.crmContact.deleteMany({ where: { id: contactId } });
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`navigation overlays keep focus and keyboard behavior (${locale}, ${theme})`, async ({
      page,
    }) => {
      const t = locale === "en" ? en : ar;
      await page.setViewportSize({
        width: locale === "ar" ? 390 : 1440,
        height: 900,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem("platform_admin_locale", locale);
          localStorage.setItem("platform_admin_theme", theme);
        },
        { locale, theme },
      );
      await page.goto("/dashboard");
      const trigger = page.getByRole("button", {
        name: t.quickJump.universalSearch,
      });
      await trigger.click();
      const palette = page.getByRole("dialog", {
        name: t.quickJump.universalSearch,
        exact: true,
      });
      const search = palette.getByRole("combobox", {
        name: t.quickJump.searchLabel,
        exact: true,
      });
      await expect(search).toBeFocused();
      await search.fill("q");
      await expect(palette).toContainText(t.quickJump.helper);
      await search.press("ArrowUp");
      await search.fill(marker);
      await expect(palette.getByRole("option")).toHaveCount(1);
      await expect(palette.getByRole("option")).toContainText(marker);
      await search.press("ArrowDown");
      await search.press("Enter");
      await expect(page).toHaveURL(new RegExp(contactId));

      await page.goto("/dashboard");
      const bell = page.getByRole("button", {
        name: t.actions.notifications,
      });
      await bell.click();
      const notifications = page.getByRole("dialog", {
        name: t.notificationsCenter.title,
        exact: true,
      });
      await expect(notifications).toBeVisible();
      await page.route("**/dashboard", (route) =>
        route.request().method() === "POST"
          ? route.fulfill({
              status: 500,
              contentType: "text/plain",
              body: "Test notification failure",
            })
          : route.continue(),
      );
      await notifications
        .getByRole("button", {
          name: t.notificationsCenter.markAllRead,
          exact: true,
        })
        .click();
      const confirmation = page
        .getByRole("dialog")
        .filter({ has: page.locator("[data-confirm-dialog]") });
      await expect(confirmation).toBeVisible();
      await expect(notifications).toHaveCount(0);
      await confirmation
        .getByRole("button", { name: t.actions.cancel, exact: true })
        .click();
      await expect(bell).toBeFocused();
      expect(
        (
          await db.notification.findUniqueOrThrow({
            where: { id: notificationId },
          })
        ).isRead,
      ).toBe(false);
      await bell.click();
      await notifications
        .getByRole("button", {
          name: t.notificationsCenter.markAllRead,
          exact: true,
        })
        .click();
      await confirmation.getByRole("button").last().click();
      await expect(confirmation.getByRole("alert")).toBeVisible();
      await confirmation
        .getByRole("button", { name: t.actions.cancel, exact: true })
        .click();
      await expect(bell).toBeFocused();

      await page.setViewportSize({ width: 390, height: 900 });
      const menu = page.getByRole("button", {
        name: t.topbar.toggleNavigationMenu,
        exact: true,
      });
      const overflow = await page.evaluate(() => document.body.style.overflow);
      await menu.click();
      const drawer = page.getByRole("dialog", {
        name: t.sidebar.mobileNavigation,
        exact: true,
      });
      await expect(drawer).toBeVisible();
      expect((await drawer.boundingBox())!.width).toBeLessThanOrEqual(
        page.viewportSize()!.width * 0.85,
      );
      expect(await page.evaluate(() => document.body.style.overflow)).toBe(
        "hidden",
      );
      const items = drawer.locator(
        "button:visible:not([disabled]), a[href]:visible",
      );
      await items.last().focus();
      await page.keyboard.press("Tab");
      await expect(items.first()).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(items.last()).toBeFocused();
      await page.keyboard.press("ControlOrMeta+k");
      await expect(palette).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(palette).toHaveCount(0);
      await expect(drawer).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(menu).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe(
        overflow,
      );
      await menu.click();
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(drawer).toHaveCount(0);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe(
        overflow,
      );

      await page.setViewportSize({
        width: locale === "ar" ? 390 : 1440,
        height: 900,
      });
      await page.goto("/dashboard/cms/stats");
      await page
        .getByRole("main")
        .getByRole("button", { name: t.statsView.newStat, exact: true })
        .click();
      const form = page.getByRole("dialog", {
        name: t.statsView.newStat,
        exact: true,
      });
      const iconTrigger = form.locator('button[aria-haspopup="dialog"]');
      const initialField = await iconTrigger.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        radius: getComputedStyle(element).borderRadius,
      }));
      await iconTrigger.click();
      const icons = page.getByRole("dialog", {
        name: t.iconPicker.selectIcon,
        exact: true,
      });
      await expect(
        icons.getByRole("textbox", {
          name: t.iconPicker.searchIcons,
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(icons).toHaveCount(0);
      await expect(form).toBeVisible();
      await expect(iconTrigger).toBeFocused();
      expect(
        await iconTrigger.evaluate((element) => ({
          height: element.getBoundingClientRect().height,
          radius: getComputedStyle(element).borderRadius,
        })),
      ).toEqual(initialField);
      await iconTrigger.click();
      const icon = icons.locator("button[title]").first();
      const title = await icon.getAttribute("title");
      await icon.click();
      await expect(icons).toHaveCount(0);
      await expect(iconTrigger).toBeFocused();
      await expect(iconTrigger).toHaveAccessibleName(
        `${t.iconPicker.selectIcon}: ${title}`,
      );
      await form
        .getByRole("button", { name: t.actions.close, exact: true })
        .click();
      await expect(form).toHaveCount(0);
      expect(
        (
          await db.notification.findUniqueOrThrow({
            where: { id: notificationId },
          })
        ).isRead,
      ).toBe(false);
    });
  }

for (const locale of ["en", "ar"] as const) {
  test(`palette ignores obsolete responses and shows failures (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.goto("/dashboard");
    await page
      .getByRole("button", { name: t.quickJump.universalSearch })
      .click();
    const palette = page.getByRole("dialog", {
      name: t.quickJump.universalSearch,
      exact: true,
    });
    const input = palette.getByRole("combobox");
    const missing = `missing-${randomUUID()}`;
    let oldFetched = false,
      newFetched = false;
    let releaseOld!: () => void, releaseNew!: () => void;
    const oldBlocked = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });
    const newBlocked = new Promise<void>((resolve) => {
      releaseNew = resolve;
    });
    await page.route("**/dashboard", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const query = route.request().postData() ?? "";
      const response = await route.fetch();
      if (query.includes(marker)) {
        oldFetched = true;
        await oldBlocked;
      } else if (query.includes(missing)) {
        newFetched = true;
        await newBlocked;
      }
      await route.fulfill({ response });
    });
    try {
      await input.fill(marker);
      await expect.poll(() => oldFetched).toBe(true);
      await input.fill(missing);
      await expect(palette.getByRole("listbox")).toHaveAttribute(
        "aria-busy",
        "true",
      );
      releaseOld();
      await expect.poll(() => newFetched).toBe(true);
      await expect(palette.getByRole("option")).toHaveCount(0);
    } finally {
      releaseOld();
      releaseNew();
    }
    await expect(palette).toContainText(t.quickJump.noMatches);
    await page.route("**/dashboard", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Test search failure",
          })
        : route.continue(),
    );
    await input.fill(`failure-${randomUUID()}`);
    await expect(palette.getByRole("alert")).toHaveText(
      locale === "ar" ? t.quickJump.searchFailed : "Test search failure",
    );
    await expect(palette.getByRole("option")).toHaveCount(0);
  });

  test(`driver palette cannot search a private contact (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.context().clearCookies();
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await login(page, users.driver.email, users.driver.password);
    await expect(page).toHaveURL(/\/dashboard/);
    await page
      .getByRole("button", { name: t.quickJump.universalSearch })
      .click();
    const palette = page.getByRole("dialog", {
      name: t.quickJump.universalSearch,
      exact: true,
    });
    await palette.getByRole("combobox").fill(marker);
    await expect(palette).toContainText(t.quickJump.noMatches);
    await expect(palette.getByRole("option")).toHaveCount(0);
  });
}
