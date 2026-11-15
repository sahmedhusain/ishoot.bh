import { expect, type Page } from "@playwright/test";
import adminUsers from "./fixtures/users.json";

export function attachErrorListeners(page: Page) {
  const errors: string[] = [];
  const serverErrors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/favicon|Download the React DevTools|\[Fast Refresh\]|webpack-hmr|_next\/webpack|ERR_ABORTED/i.test(text)) {
      return;
    }
    errors.push(`console.error (${page.url()}): ${text}`);
  });
  page.on("response", (res) => {
    if (res.status() === 401 || res.status() === 404) {
      console.log(`${res.status()} URL: ${res.url()}`);
    }
    if (res.status() >= 500) {
      serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });
  return { errors, serverErrors };
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/login", { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const usernameField = page.locator("#login-username:visible, input[name=\"username\"]:visible").first();
  if (!(await usernameField.isVisible({ timeout: 10_000 }).catch(() => false))) {
    await page.reload({ waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => {});
  }
  const engBtn = page.getByRole("button", { name: "English" });
  if ((await engBtn.count()) > 0 && (await engBtn.first().isVisible())) {
    await engBtn.first().click();
    await page.waitForLoadState("networkidle").catch(() => {});
  }
  const passwordField = page.locator("#login-password:visible, input[type=\"password\"]:visible").first();
  await expect(usernameField).toBeVisible({ timeout: 20_000 });
  await expect(async () => {
    await usernameField.fill(adminUsers.admin.username);
    await passwordField.fill(adminUsers.admin.password);
    await expect(usernameField).toHaveValue(adminUsers.admin.username);
    await page.locator('button[type="submit"]:visible').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  }).toPass({ timeout: 65_000 });
}

export async function auditAdminRoutes(page: Page, routes: string[]) {
  for (const route of routes) {
    let res = null;
    try {
      res = await page.goto(route, { waitUntil: "load" });
    } catch (err) {
      if (err instanceof Error && /ERR_ABORTED|interrupted by another navigation/i.test(err.message)) {
        await page.waitForTimeout(500);
        res = await page.goto(route, { waitUntil: "load" });
      } else {
        throw err;
      }
    }
    if (res) {
      expect(res.status(), `HTTP status for ${route}`).toBeLessThan(500);
    }
    await expect(page.locator("main, h1, h2").first(), `Content visible on ${route}`).toBeVisible({ timeout: 20_000 });
    expect(page.url(), `Route ${route} redirected to /login`).not.toMatch(/\/login/);

    // Exercise tabs on the page
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      if (await tabs.nth(i).isVisible()) {
        await tabs.nth(i).click();
        await page.waitForTimeout(100);
      }
    }
    await page.waitForLoadState("domcontentloaded");
  }
}
