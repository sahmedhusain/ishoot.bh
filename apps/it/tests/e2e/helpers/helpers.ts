import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import users from "./fixtures/users.json";

const root = path.resolve(__dirname, "../..");

export const admin = users.admin;

/** The demo profile every seeded run uses, read from seeds/assets so tests never hardcode a company. */
export const demo = {
  ...JSON.parse(
    fs.readFileSync(
      path.join(root, "seeds/assets/demo/company.json"),
      "utf8",
    ),
  ),
  theme: JSON.parse(
    fs.readFileSync(
      path.join(root, "seeds/assets/demo/theme.json"),
      "utf8",
    ),
  ),
};

/** Names of every company profile other than the demo; none may ever appear on a demo page. */
export const otherCompanyNames: string[] = fs
  .readdirSync(path.join(root, "seeds/assets"))
  .filter(
    (name) =>
      name !== "demo" &&
      fs.existsSync(path.join(root, "seeds/assets", name, "company.json")),
  )
  .flatMap((name) => {
    const { display = {}, company = {} } = JSON.parse(
      fs.readFileSync(
        path.join(root, "seeds/assets", name, "company.json"),
        "utf8",
      ),
    );
    return [
      display.nameEn,
      display.nameAr,
      company.companyNameEn,
      company.companyNameAr,
    ].filter(Boolean);
  })
  // Profiles may intentionally share a trading name with the demo (e.g. the
  // all-modules profile). Only names foreign to the active company are leaks.
  .filter((name) => ![
    demo.display?.nameEn,
    demo.display?.nameAr,
    demo.company?.companyNameEn,
    demo.company?.companyNameAr,
  ].includes(name));

export const channels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export async function login(
  page: Page,
  email = admin.email,
  password = admin.password,
) {
  await page.goto("/login");
  // Next's streaming response can temporarily retain a hidden copy of the form.
  await page.locator('input[type="email"]:visible').fill(email);
  await page.locator('input[type="password"]:visible').fill(password);
  await page.locator('button[type="submit"]:visible').click();
}

/** Fails the test on uncaught page errors and console errors (ignoring known browser noise). */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (
      /favicon|Download the React DevTools|\[Fast Refresh\]|webpack-hmr|_next\/webpack|ERR_ABORTED/.test(
        text,
      )
    )
      return;
    // A failed load names only its status; the location says what failed.
    const where = message.location().url;
    errors.push(
      `console: ${text}${where && /Failed to load resource/.test(text) ? ` (${where})` : ""}`,
    );
  });
  return {
    errors,
    assertClean: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

/** Every <img> on the page that should have loaded did load. */
export async function brokenImages(page: Page) {
  return page.evaluate(async () => {
    const images = Array.from(document.images);
    images.forEach((img) => (img.loading = "eager"));
    await Promise.all(
      images.map((img) =>
        img.complete
          ? null
          : new Promise((r) => {
              img.onload = img.onerror = r;
              setTimeout(r, 8000);
            }),
      ),
    );
    return images
      .filter((img) => img.currentSrc && img.naturalWidth === 0)
      .map((img) => img.currentSrc);
  });
}

/** The CSS variable values the company theme stylesheet put on <html>. */
export async function themeVariable(page: Page, name: string) {
  return page.evaluate(
    (variable) =>
      getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim(),
    name,
  );
}

/** The page's own alert messages (Next.js adds a route announcer with role="alert" too). */
export const alertMessage = (page: Page) =>
  page.locator('[role="alert"]:not(#__next-route-announcer__)');

/** What a visitor can see or download: text, title, meta tags, image sources and alt text (not dev-mode stack traces). */
export async function visibleContent(page: Page) {
  return page.evaluate(() =>
    [
      document.title,
      document.body.innerText,
      ...Array.from(document.querySelectorAll("meta[content]"), (m) =>
        m.getAttribute("content"),
      ),
      ...Array.from(
        document.images,
        (img) => `${img.getAttribute("src")} ${img.alt}`,
      ),
      ...Array.from(document.querySelectorAll("a[href]"), (a) =>
        a.getAttribute("href"),
      ),
    ].join("\n"),
  );
}

/** Accept only the shared confirmation dialog; ordinary forms remain under the spec's control. */
export async function acceptConfirmations(page: Page) {
  await page.addLocatorHandler(
    page
      .getByRole("dialog")
      .filter({ has: page.locator("[data-confirm-dialog]") }),
    async (dialog) => {
      const typed = dialog.getByRole("textbox");
      if (await typed.count())
        await typed.fill((await typed.getAttribute("placeholder"))!);
      await dialog.getByRole("button").last().click();
      await expect(dialog).toHaveCount(0);
    },
  );
}
