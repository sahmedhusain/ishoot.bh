import { selectOption } from "./helpers/select-option";
import { expect, test } from "@playwright/test";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
const en = enLocale.admin;
const ar = arLocale.admin;

for (const locale of ["en", "ar"] as const)
  for (const theme of ["light", "dark"] as const) {
    test(`editor dialogs validate and retain input (${locale}, ${theme})`, async ({
      page,
    }) => {
      const t = locale === "en" ? en : ar;
      const copy = t.richText;
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
      const nativeDialogs: string[] = [];
      page.on("dialog", async (dialog) => {
        nativeDialogs.push(dialog.type());
        await dialog.dismiss();
      });
      await page.goto("/dashboard/cms/articles/new");
      const editor = page
        .getByRole("main")
        .locator('.rich-text-editor[contenteditable="true"]')
        .first();
      await expect(editor).toBeVisible();
      const wrapper = editor.locator("..").locator("..");
      const toolbar = wrapper.getByRole("toolbar");
      await wrapper.evaluate((element) => {
        element.style.transform = "translateZ(0)";
        element.style.overflow = "hidden";
      });
      await editor.fill("Audit link text");
      await editor.press("ControlOrMeta+a");
      await toolbar
        .getByRole("button", { name: copy.link, exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      expect(
        await dialog.evaluate(
          (element) =>
            element.closest("[data-modal-container]")?.parentElement ===
            document.body,
        ),
      ).toBe(true);
      const link = dialog.getByRole("textbox", {
        name: copy.linkPrompt,
        exact: true,
      });
      await link.fill("javascript:alert(1)");
      await dialog
        .getByRole("button", { name: copy.apply, exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toHaveText(copy.linkInvalid);
      await expect(link).toHaveValue("javascript:alert(1)");
      await expect(editor.locator("a")).toHaveCount(0);
      await link.fill("https://example.test/readme");
      await dialog
        .getByRole("button", { name: copy.apply, exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(
        editor.getByRole("link", { name: "Audit link text" }),
      ).toHaveAttribute("href", "https://example.test/readme");

      const video = toolbar.getByRole("button", {
        name: copy.video,
        exact: true,
      });
      await video.focus();
      await video.click();
      await dialog
        .getByRole("textbox", { name: copy.videoPrompt, exact: true })
        .fill("https://example.test/unsupported");
      await dialog
        .getByRole("button", { name: copy.apply, exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toHaveText(copy.videoInvalid);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(video).toBeFocused();
      await expect(editor.locator("iframe")).toHaveCount(0);

      await toolbar
        .getByRole("button", { name: copy.embed, exact: true })
        .click();
      await selectOption(
        dialog.getByRole("combobox", {
          name: copy.embedPresetPrompt,
          exact: true,
        }),
        "calendly",
      );
      const embed = dialog.getByRole("textbox", {
        name: copy.embedUrlPrompt,
        exact: true,
      });
      await embed.fill("https://example.test/unsupported");
      await dialog
        .getByRole("button", { name: copy.apply, exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toHaveText(copy.embedInvalid);
      await expect(embed).toHaveValue("https://example.test/unsupported");
      await dialog
        .getByRole("button", { name: t.actions.cancel, exact: true })
        .click();
      await expect(dialog).toHaveCount(0);

      let release!: () => void;
      const uploadBlocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/upload/init", async (route) => {
        await uploadBlocked;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Test upload failure" }),
        });
      });
      await wrapper
        .getByLabel(copy.uploadImages, { exact: true })
        .setInputFiles({
          name: "audit.png",
          mimeType: "image/png",
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=",
            "base64",
          ),
        });
      try {
        await expect(
          toolbar.getByRole("button", { name: copy.image, exact: true }),
        ).toBeDisabled();
      } finally {
        release();
      }
      await expect(wrapper.getByRole("alert")).toBeVisible();
      await expect(
        toolbar.getByRole("button", { name: copy.image, exact: true }),
      ).toBeEnabled();
      expect(nativeDialogs).toEqual([]);
    });
  }
