import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import en from "../../../../packages/locales/src/admin/en";
import ar from "../../../../packages/locales/src/admin/ar";
import { testDatabase } from "../../helpers";

const db = testDatabase();
let marker = "",
  contactId = "";
test.beforeEach(async () => {
  marker = `e2e-guard-${randomUUID()}`;
  const contact = await db.crmContact.create({
    data: { firstName: marker, companyName: marker },
  });
  contactId = contact.id;
});
test.afterEach(async () => {
  await db.cmsArticle.deleteMany({ where: { slug: marker } });
  await db.crmContact.deleteMany({ where: { id: contactId } });
});
test.afterAll(() => db.$disconnect());

async function openEditor(page: Page) {
  await page.goto("/dashboard/cms/articles");
  await page
    .getByRole("main")
    .locator('a[href="/dashboard/cms/articles/new"]')
    .click();
  await expect(page).toHaveURL(/\/articles\/new$/);
}

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`unsaved links, quick search and logout preserve edits (${locale}, ${theme})`, async ({
      page,
    }) => {
      const t = locale === "en" ? en : ar;
      await page.setViewportSize({
        width: locale === "ar" ? 390 : 1440,
        height: 900,
      });
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem("platform_admin_locale", locale);
          localStorage.setItem("platform_admin_theme", theme);
        },
        { locale, theme },
      );
      await openEditor(page);
      const main = page.getByRole("main");
      const title = main
        .getByRole("textbox", {
          name: new RegExp(`^${t.cmsArticles.fields.title}( \\(|$)`),
        })
        .first();
      await title.fill(marker);
      await main.locator('a[href="/dashboard/cms/articles"]').click();
      const dialog = page.getByRole("dialog", {
        name: t.unsavedChanges.title,
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
        .click();
      await expect(title).toHaveValue(marker);
      await expect(page).toHaveURL(/\/articles\/new$/);

      await page.keyboard.press("ControlOrMeta+k");
      const palette = page.getByRole("listbox", {
        name: t.quickJump.resultsLabel,
        exact: true,
      });
      await expect(palette).toBeVisible();
      const search = page.getByRole("combobox", {
        name: t.quickJump.searchLabel,
        exact: true,
      });
      await search.fill(marker);
      await expect(palette.getByRole("option")).toHaveCount(1);
      await search.press("Enter");
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(title).toHaveValue(marker);

      let logoutRequests = 0;
      await page.route("**/api/auth/logout", async (route) => {
        logoutRequests++;
        await route.fulfill({ status: 500 });
      });
      await page
        .getByRole("button", { name: t.accountMenu.title, exact: true })
        .click();
      await page
        .getByRole("menuitem", {
          name: t.profileDropdown.signOutSession,
          exact: true,
        })
        .click();
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
        .click();
      expect(logoutRequests).toBe(0);
      await expect(title).toHaveValue(marker);
      expect(
        await main.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      await main.locator('a[href="/dashboard/cms/articles"]').click();
      await dialog
        .getByRole("button", { name: t.unsavedChanges.discard, exact: true })
        .click();
      await expect(page).toHaveURL(/\/cms\/articles$/);
    });
  }

for (const locale of ["en", "ar"] as const) {
  test(`browser back and forward restore drafts without duplicate entries (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await openEditor(page);
    await page.evaluate(() => {
      const link = document.createElement("a");
      link.href = "#guard-case";
      document.body.append(link);
      link.click();
      link.remove();
    });
    await expect(page).toHaveURL(/#guard-case$/);
    await page
      .getByRole("main")
      .locator('a[href="/dashboard/cms/articles"]')
      .click();
    await expect(page).toHaveURL(/\/cms\/articles$/);
    const length = await page.evaluate(() => history.length);
    await page.evaluate(() => history.back());
    await expect(page).toHaveURL(/\/articles\/new#guard-case$/);
    const title = page
      .getByRole("main")
      .getByRole("textbox", {
        name: new RegExp(`^${t.cmsArticles.fields.title}( \\(|$)`),
      })
      .first();
    await title.fill(marker);
    const dialog = page.getByRole("dialog", {
      name: t.unsavedChanges.title,
      exact: true,
    });
    for (const direction of ["forward", "back"] as const) {
      await page.evaluate(
        (direction) =>
          direction === "back" ? history.go(-2) : history.forward(),
        direction,
      );
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(/\/articles\/new#guard-case$/);
      await dialog
        .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
        .click();
      await expect(title).toHaveValue(marker);
      expect(await page.evaluate(() => history.length)).toBe(length);
    }
    await page.evaluate(() => history.forward());
    await dialog
      .getByRole("button", { name: t.unsavedChanges.discard, exact: true })
      .click();
    await expect(page).toHaveURL(/\/cms\/articles$/);
    expect(await page.evaluate(() => history.length)).toBe(length);
  });

  test(`failed save stays guarded, successful draft save clears it (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await openEditor(page);
    const main = page.getByRole("main");
    await main
      .getByRole("textbox", { name: t.cmsArticles.fields.slug, exact: true })
      .fill(marker);
    await main
      .getByRole("button", { name: t.cmsArticles.saveDraft, exact: true })
      .click();
    await expect(main.getByRole("status")).toBeVisible();
    await main.locator('a[href="/dashboard/cms/articles"]').click();
    const dialog = page.getByRole("dialog", {
      name: t.unsavedChanges.title,
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
      .click();
    const titles = main.getByRole("textbox", {
      name: new RegExp(`^${t.cmsArticles.fields.title}( \\(|$)`),
    });
    for (const field of await titles.all()) await field.fill(marker);
    await main
      .getByRole("button", { name: t.cmsArticles.saveDraft, exact: true })
      .click();
    await expect(page).toHaveURL(/\/cms\/articles\/(?!new$)[^/]+$/);
    await expect
      .poll(() =>
        db.cmsArticle.count({ where: { slug: marker, status: "draft" } }),
      )
      .toBe(1);
    await expect(dialog).toHaveCount(0);
    await main.locator('a[href="/dashboard/cms/articles"]').click();
    await expect(page).toHaveURL(/\/cms\/articles$/);
    await expect(dialog).toHaveCount(0);
  });
}

test("browser reload uses the native guard and undoing an edit clears dirty state", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  await openEditor(page);
  const title = page
    .getByRole("main")
    .getByRole("textbox", {
      name: new RegExp(`^${en.cmsArticles.fields.title}( \\(|$)`),
    })
    .first();
  await title.fill(marker);
  const original = page.url();
  const native = page.waitForEvent("dialog");
  const reload = page.reload({ timeout: 10_000 }).catch(() => null);
  const dialog = await native;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await reload;
  await expect(page).toHaveURL(original);
  await expect(title).toHaveValue(marker);
  await title.fill("");
  await page
    .getByRole("main")
    .locator('a[href="/dashboard/cms/articles"]')
    .click();
  await expect(page).toHaveURL(/\/cms\/articles$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const locale of ["en", "ar"] as const) {
  test(`theme drafts survive tabs and a failed save, with pending fields locked (${locale})`, async ({
    page,
  }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (/hydrat|didn.t match/i.test(message.text()))
        hydrationErrors.push(message.text());
    });
    const t = locale === "en" ? en : ar;
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.goto("/dashboard/settings/company");
    const main = page.getByRole("main");
    await main
      .getByRole("tab", { name: t.setupWizard.steps.brand, exact: true })
      .click();
    const color = main
      .getByRole("textbox", { name: t.setupWizard.brand.primary, exact: true })
      .and(main.locator('input:not([type="color"])'));
    const original = await color.inputValue();
    const changed = original === "#102030" ? "#203040" : "#102030";
    await color.fill(changed);
    await main
      .getByRole("tab", { name: t.companySettingsTabs.general, exact: true })
      .click();
    await main
      .getByRole("tab", { name: t.setupWizard.steps.brand, exact: true })
      .click();
    await expect(color).toHaveValue(changed);
    let release!: () => void;
    const blocked = new Promise<void>((done) => {
      release = done;
    });
    await page.route("**/dashboard/settings/company", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await blocked;
      await route.fulfill({ status: 500, body: "E2E failed save" });
    });
    try {
      await main.getByTestId("theme-save").click();
      await expect
        .poll(() =>
          color.evaluate(
            (element) => !!element.closest('[inert][aria-busy="true"]'),
          ),
        )
        .toBe(true);
    } finally {
      release();
    }
    await expect(main.getByRole("alert")).toBeVisible();
    await expect(color).toHaveValue(changed);
    await main
      .locator('a[href="/dashboard/settings/preferences"]')
      .first()
      .click();
    await page
      .getByRole("dialog", { name: t.unsavedChanges.title, exact: true })
      .getByRole("button", { name: t.unsavedChanges.stay, exact: true })
      .click();
    await color.fill(original);
    await main
      .locator('a[href="/dashboard/settings/preferences"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/settings\/preferences$/);
    expect(hydrationErrors).toEqual([]);
  });
}

test("a completed save cannot redirect after the editor has been left", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  await openEditor(page);
  const main = page.getByRole("main");
  const titles = main.getByRole("textbox", {
    name: new RegExp(`^${en.cmsArticles.fields.title}( \\(|$)`),
  });
  for (const title of await titles.all()) await title.fill(marker);
  await main
    .getByRole("textbox", { name: en.cmsArticles.fields.slug, exact: true })
    .fill(marker);
  let release!: () => void;
  const blocked = new Promise<void>((done) => {
    release = done;
  });
  await page.route("**/dashboard/cms/articles/new", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await blocked;
    await route.continue();
  });
  try {
    await main
      .getByRole("button", { name: en.cmsArticles.saveDraft, exact: true })
      .click();
    await expect(main.locator('[inert][aria-busy="true"]')).toBeVisible();
    await page.evaluate(() => history.back());
    await page
      .getByRole("dialog", { name: en.unsavedChanges.title, exact: true })
      .getByRole("button", { name: en.unsavedChanges.discard, exact: true })
      .click();
    await expect(page).toHaveURL(/\/cms\/articles$/);
  } finally {
    release();
  }
  await expect
    .poll(() =>
      db.cmsArticle.count({ where: { slug: marker, status: "draft" } }),
    )
    .toBe(1);
  await expect(page).toHaveURL(/\/cms\/articles$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("approved ordinary same-origin links do not ask twice", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  await openEditor(page);
  await page
    .getByRole("main")
    .getByRole("textbox", {
      name: new RegExp(`^${en.cmsArticles.fields.title}( \\(|$)`),
    })
    .first()
    .fill(marker);
  await page.getByRole("main").evaluate((main) => {
    const link = document.createElement("a");
    link.href = "/dashboard/cms/articles";
    link.textContent = "E2E ordinary link";
    main.append(link);
  });
  let nativeDialogs = 0;
  page.on("dialog", async (dialog) => {
    nativeDialogs++;
    await dialog.dismiss();
  });
  await page
    .getByRole("link", { name: "E2E ordinary link", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: en.unsavedChanges.title, exact: true })
    .getByRole("button", { name: en.unsavedChanges.discard, exact: true })
    .click();
  await expect(page).toHaveURL(/\/cms\/articles$/);
  expect(nativeDialogs).toBe(0);
});
