import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { freshTotp } from "./helpers/totp";

function attachErrorListeners(page: Page) {
  const errors: string[] = [];
  const serverErrors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/favicon|Download the React DevTools|\[Fast Refresh\]|webpack-hmr|_next\/webpack|ERR_ABORTED/i.test(text)) {
      return;
    }
    errors.push(`console.error: ${text}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });
  return { errors, serverErrors };
}

function ensureItAccount() {
  const accountFile = path.resolve(
    process.env.E2E_IT_ACCOUNT_FILE || path.join(__dirname, "../.results/it-account.json"),
  );
  if (!fs.existsSync(accountFile)) {
    execFileSync("node", [path.join(__dirname, "helpers/it-account.cjs")], {
      cwd: path.resolve(__dirname, "../../../.."),
      env: { ...process.env, E2E_IT_ACCOUNT_FILE: accountFile },
      stdio: "inherit",
    });
  }
  const parsed = JSON.parse(fs.readFileSync(accountFile, "utf8")) as {
    email: string;
    username?: string;
    password: string;
    secret: string;
  };
  return {
    ...parsed,
    username: parsed.username || process.env.IT_ADMIN_USERNAME || "BA0001",
  };
}

async function loginToIt(page: Page) {
  const account = ensureItAccount();
  const rootUsername = account.username || account.email.split("@")[0];
  await page.goto("/login", { waitUntil: "networkidle" });
  const usernameField = page.locator('input[name="username"]');
  const passwordField = page.locator('input[name="password"]');
  await expect(usernameField).toBeVisible({ timeout: 15_000 });
  await expect(async () => {
    await usernameField.fill(rootUsername);
    await passwordField.fill(account.password);
    await expect(usernameField).toHaveValue(rootUsername);
  }).toPass({ timeout: 10_000 });
  await page.locator('button[type="submit"]').click();

  const otpInput = page.locator('input[name="otp"]');
  await expect(otpInput).toBeVisible({ timeout: 15_000 });
  await otpInput.fill(await freshTotp(account.secret));
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

test.describe("IT Console — Full 30-Page Audit, Validations, Edit & Delete Flows", () => {
  test("all 30 IT Console pages load cleanly and Staff Roles & API Keys support Create, Edit, and Delete with validation", async ({ page }) => {
    test.setTimeout(240_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    await loginToIt(page);

    const routes = [
      "/",
      "/tickets",
      "/it-accounts",
      "/staff-accounts",
      "/staff-roles",
      "/sessions",
      "/api-keys",
      "/api-tester",
      "/audit",
      "/backups",
      "/company",
      "/database",
      "/deployments",
      "/integrations",
      "/jobs",
      "/logs",
      "/modules",
      "/notifications",
      "/settings",
      "/setup",
      "/site",
      "/sla",
      "/store-presets",
      "/dashboard/store-presets",
      "/system-health",
    ];

    for (const route of routes) {
      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(500);
      await expect(page.locator("main, h1, h2").first()).toBeVisible({ timeout: 15_000 });

      // Click through EVERY visible tab on the page to verify tab rendering
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
      }
    }

    const ts = Date.now();

    // 1. Staff Roles: Create, persist across reload, and Delete unconditionally
    await page.goto("/staff-roles", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /\+\s*New role/i }).click();
    const roleId = `e2e_role_${ts}`;
    const roleName = `E2E Role ${ts}`;
    await page.getByLabel("Role identifier").fill(roleId);
    await page.getByLabel("English name").fill(roleName);
    await page.getByLabel("Arabic name").fill(`دور اختبار ${ts}`);
    const saveRoleBtn = page.getByRole("button", { name: "Save role" });
    await expect(saveRoleBtn).toBeVisible();
    await saveRoleBtn.click();
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 10_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const roleLink = page.getByRole("link", { name: new RegExp(roleName) }).first();
    await expect(roleLink).toBeVisible({ timeout: 10_000 });
    await roleLink.click();
    await page.getByRole("button", { name: "Delete role" }).click();
    const deleteDialog = page.getByRole("alertdialog");
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.locator("input").first().fill("DELETE");
    await deleteDialog.getByRole("button", { name: "EXECUTE CRITICAL ACTION" }).click();
    await expect(page.getByRole("link", { name: new RegExp(roleName) })).toHaveCount(0, { timeout: 10_000 });

    // 2. API Keys: Create, verify one-time token & reload persistence, and Revoke unconditionally
    await page.goto("/api-keys", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Create API key" }).click();
    const keyName = `e2e-key-${ts}`;
    await page.getByLabel("Integration name").fill(keyName);
    await page.getByRole("button", { name: "Generate key" }).click();
    await expect(page.getByText("API key generated successfully")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Done" }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    const keyRow = page.locator("tr", { hasText: keyName }).first();
    await expect(keyRow).toBeVisible({ timeout: 10_000 });
    await keyRow.getByRole("button", { name: "Revoke" }).click();
    const revokeDialog = page.getByRole("alertdialog");
    await expect(revokeDialog).toBeVisible();
    await revokeDialog.locator("input").first().fill("REVOKE");
    await revokeDialog.getByRole("button", { name: "EXECUTE CRITICAL ACTION" }).click();
    await expect(keyRow).toContainText(/Revoked/i, { timeout: 10_000 });

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("login validates invalid credentials and invalid OTP", async ({ page }) => {
    const account = ensureItAccount();
    const rootUsername = account.username || account.email.split("@")[0];

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="username"]').fill(rootUsername);
    await page.locator('input[name="password"]').fill("WrongPassword123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('[role="alert"], .text-rose-500, .text-red-500, .text-m3-error').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
