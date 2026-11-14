import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createITAccountForIT,
  listITAccountsForIT,
  listIdentitySessionsForIT,
  revokeIdentitySessionForIT,
  updateITAccountForIT,
} from "@platform/api-client";
import { totp } from "./helpers/totp";

process.env.API_URL ||= "http://localhost:8080";

test.describe("IT Console Auth & Go Identity API Roundtrip", () => {
  test("signs in with TOTP and executes GET/POST/PUT/DELETE via Go Identity API", async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const accountFile = path.resolve(
      process.env.E2E_IT_ACCOUNT_FILE ||
        path.join(__dirname, "../.results/it-account.json"),
    );

    if (!fs.existsSync(accountFile)) {
      execFileSync("node", [path.join(__dirname, "helpers/it-account.cjs")], {
        cwd: path.resolve(__dirname, "../../../.."),
        env: { ...process.env, E2E_IT_ACCOUNT_FILE: accountFile },
        stdio: "inherit",
      });
    }

    const account = JSON.parse(fs.readFileSync(accountFile, "utf8")) as {
      email: string;
      password: string;
      secret: string;
    };

    await page.goto("/login");
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await usernameInput.fill(account.email);
    await passwordInput.fill(account.password);
    await page.locator('button[type="submit"]').click();

    const otpInput = page.locator('input[name="otp"]');
    await expect(otpInput).toBeVisible();
    await otpInput.fill(totp(account.secret));
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/);

    const accessCookieName = process.env.IT_ACCESS_COOKIE || "platform_it_access";
    const rootToken = (await context.cookies()).find((c) => c.name === accessCookieName)?.value;
    expect(rootToken).toBeTruthy();

    const accounts = await listITAccountsForIT(rootToken!);
    expect(Array.isArray(accounts.items)).toBe(true);
    expect(accounts.items.length).toBeGreaterThan(0);

    const tempEmail = `it-arch-${randomUUID()}@example.test`;
    const tempPassword = `${randomUUID()}-Aa1!`;
    const created = await createITAccountForIT(rootToken!, {
      email: tempEmail,
      password: tempPassword,
      role: "it_engineer",
    });
    expect(created.subjectId).toBeTruthy();

    const guest = await browser.newContext({
      baseURL: baseURL || "http://localhost:3002",
    });
    try {
      const other = await guest.newPage();
      await other.goto("/login");
      await other.locator('input[name="username"]').fill(tempEmail);
      await other.locator('input[name="password"]').fill(tempPassword);
      await other.locator('button[type="submit"]').click();

      const guestOtp = other.locator('input[name="otp"]');
      await expect(guestOtp).toBeVisible();
      await guestOtp.fill(totp(created.secret));
      await other.locator('button[type="submit"]').click();
      await expect(other).toHaveURL(/\/$/);

      const sessions = await listIdentitySessionsForIT(rootToken!, {
        realm: "it",
        subjectId: created.subjectId,
      });
      expect(sessions.items.length).toBe(1);

      await updateITAccountForIT(rootToken!, created.subjectId, {
        role: "it_engineer",
        active: true,
      });

      await revokeIdentitySessionForIT(rootToken!, sessions.items[0].id);

      const afterRevoke = await listIdentitySessionsForIT(rootToken!, {
        realm: "it",
        subjectId: created.subjectId,
      });
      expect(afterRevoke.items.filter((s) => !s.revokedAt)).toHaveLength(0);
      expect(afterRevoke.items[0]?.revokedAt).toBeTruthy();
    } finally {
      await updateITAccountForIT(rootToken!, created.subjectId, {
        role: "it_engineer",
        active: false,
      }).catch(() => {});
      await guest.close();
    }
  });
});
