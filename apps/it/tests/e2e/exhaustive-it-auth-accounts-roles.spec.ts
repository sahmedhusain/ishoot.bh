import { expect, test } from "@playwright/test";
import t from "@platform/locales/en.json";
import { selectOption } from "./helpers/select-option";
import {
  allowExpectedFailure,
  createStrictObserver,
  extractResetUrl,
  fetchMailpitMessage,
  generateTotp,
  gotoStrict,
  loadItAccount,
  loginToItStrict,
  verifyReloadPersistence,
} from "./helpers/strict-audit";

test.describe("IT Console — Auth, Forgot/Reset Password, IT Accounts, Staff Accounts, Staff Roles & Sessions", () => {
  test("login negative checks, Mailpit password reset on temp IT user, IT accounts CRUD/lock, staff roles CRUD & delete, staff accounts & sessions", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const observer = createStrictObserver(page, "it-exhaustive-auth-accounts-roles");
    const root = loadItAccount();
    const rootUsername = root.username || process.env.IT_ADMIN_USERNAME || "BA0001";
    const ts = Date.now();
    const tempEmail = `it-reset-${ts}@example.test`;
    const tempUsername = tempEmail.split("@")[0];
    const initialPw = `InitIt!${ts}Pass99`;
    const resetPw = `ResetIt!${ts}New99`;

    // 1. /login negative validation (invalid password & invalid OTP)
    await gotoStrict(page, "/login", observer);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.locator('input[name="username"]').fill(rootUsername);
    await page.locator('input[name="password"]').fill("WrongItPassword!123");
    await allowExpectedFailure(
      observer,
      { status: [401, 403], urlPattern: /\/login/, requireHit: false },
      async () => {
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('[role="alert"], .text-rose-500, .text-red-500').first()).toBeVisible({
          timeout: 10_000,
        });
      },
    );

    // Sign in properly as Root IT Admin
    await loginToItStrict(page, root);

    // 2. /it-accounts: view matrix modal, filter controls, create temp IT account & extract TOTP secret
    await gotoStrict(page, "/it-accounts", observer);
    await expect(page.getByRole("heading", { name: /IT Team/i, level: 1 })).toBeVisible();

    const matrixBtn = page.getByRole("button", { name: t.itAccounts.viewMatrix });
    await expect(matrixBtn).toBeVisible();
    await matrixBtn.click();
    await expect(page.getByText(t.itAccounts.matrixTitle)).toBeVisible();
    const closeMatrixBtn = page.getByRole("button", { name: new RegExp(`${t.itAccounts.hideMatrix}|close`, "i") }).first();
    await closeMatrixBtn.click();

    const createForm = page.getByRole("form", { name: t.itAccounts.create, exact: true });
    await expect(createForm).toBeVisible();
    await createForm.getByLabel(t.itAccounts.email).fill(tempEmail);
    await createForm.getByLabel(t.itAccounts.password, { exact: true }).fill(initialPw);
    await createForm.getByRole("button", { name: t.itAccounts.create }).click();

    const provisioning = page.getByRole("status").filter({ hasText: t.itAccounts.provisioning });
    await expect(provisioning).toBeVisible({ timeout: 15_000 });
    const tempSecret = (await provisioning.locator("code").textContent())!.trim();
    expect(tempSecret).toMatch(/^[A-Z2-7]+$/);
    await provisioning.getByRole("button", { name: t.itAccounts.dismiss }).click();
    await expect(provisioning).toHaveCount(0);

    // Search & filter in IT Accounts list + reload persistence
    await verifyReloadPersistence(page, async () => {
      const searchBox = page.locator(`input[placeholder="${t.itAccounts.searchPlaceholder}"]`);
      await expect(searchBox).toBeVisible();
      await searchBox.fill(tempEmail);
      await expect(page.getByRole("form", { name: tempEmail, exact: true })).toBeVisible({ timeout: 10_000 });
      await searchBox.fill("");
    });

    // 3. /login/forgot & /login/reset in an isolated browser context using temp IT account
    const guestCtx = await browser.newContext({ baseURL: process.env.IT_URL || "http://localhost:3002" });
    try {
      const guest = await guestCtx.newPage();
      const guestObserver = createStrictObserver(guest, "it-forgot-reset-guest");
      await gotoStrict(guest, "/login/forgot", guestObserver);
      await guest.locator('input[name="username"]').fill(tempUsername);
      await guest.locator('input[name="email"]').fill(tempEmail);
      await guest.getByRole("button", { name: t.login.sendResetLink }).click();
      await expect(guest.getByText(t.login.resetLinkSent)).toBeVisible({ timeout: 10_000 });

      const mail = await fetchMailpitMessage(tempEmail, /Password Reset/i, 20_000);
      const resetHref = extractResetUrl(mail);
      const parsedReset = new URL(resetHref);
      await gotoStrict(guest, `${parsedReset.pathname}${parsedReset.search}`, guestObserver);

      await guest.locator('input[name="password"]').fill(resetPw);
      await guest.locator('input[name="confirmPassword"]').fill("Mismatch!99");
      await expect(guest.getByText(t.login.passwordsDoNotMatch)).toBeVisible({ timeout: 10_000 });
      await expect(guest.getByRole("button", { name: t.login.resetPasswordSubmit })).toBeDisabled();

      await guest.locator('input[name="confirmPassword"]').fill(resetPw);
      await guest.getByRole("button", { name: t.login.resetPasswordSubmit }).click();
      await expect(guest.getByText(t.login.passwordResetSuccess)).toBeVisible({ timeout: 15_000 });

      // Log in with new password + TOTP
      await gotoStrict(guest, "/login", guestObserver);
      await guest.locator('input[name="username"]').fill(tempUsername);
      await guest.locator('input[name="password"]').fill(resetPw);
      await guest.locator('button[type="submit"]').click();
      const otpInput = guest.locator('input[name="otp"]');
      await expect(otpInput).toBeVisible({ timeout: 10_000 });
      await otpInput.fill(generateTotp(tempSecret));
      await guest.locator('button[type="submit"]').click();
      await expect(guest).toHaveURL(/\/$/, { timeout: 20_000 });
      await guestObserver.assertClean("it-forgot-reset-guest");
    } finally {
      await guestCtx.close();
    }

    // Lock / deactivate temp IT account cleanly with LOCK confirmation modal
    await gotoStrict(page, "/it-accounts", observer);
    const tempForm = page.getByRole("form", { name: tempEmail, exact: true });
    await tempForm.getByLabel(t.itAccounts.active).uncheck();
    await tempForm.getByRole("button", { name: t.itAccounts.save }).click();
    const lockModal = page.getByRole("alertdialog");
    await expect(lockModal).toBeVisible();
    await lockModal.locator("input").first().fill("LOCK");
    await lockModal.getByRole("button", { name: t.itAccounts.save }).click();
    await expect(tempForm.getByLabel(t.itAccounts.active)).not.toBeChecked({ timeout: 10_000 });

    // 4. /staff-accounts: inspect filters, form validation & preview access
    await gotoStrict(page, "/staff-accounts", observer);
    await expect(page.getByRole("heading", { name: t.staffAccounts.title, exact: true })).toBeVisible();
    const staffSearch = page.locator(`input[placeholder="${t.staffAccounts.searchPlaceholder}"]`);
    await expect(staffSearch).toBeVisible();
    await staffSearch.fill("admin");
    await staffSearch.fill("");
    await expect(page.getByRole("button", { name: t.staffAccounts.preview })).toBeVisible();

    // 5. /staff-roles: create custom role, edit its name, verify reload persistence, delete via DELETE modal
    await gotoStrict(page, "/staff-roles", observer);
    await expect(page.getByRole("heading", { name: t.staffRoles.title, exact: true })).toBeVisible();
    await page.getByRole("link", { name: new RegExp(`\\+\\s*${t.staffRoles.new}`) }).click();

    const customRoleId = `qa_role_${ts}`;
    const roleName1 = `QA Role ${ts}`;
    const roleName2 = `QA Role Edited ${ts}`;
    await page.getByLabel(t.staffRoles.id).fill(customRoleId);
    await page.getByLabel(t.staffRoles.nameEn).fill(roleName1);
    await page.getByLabel(t.staffRoles.nameAr).fill(`دور ${ts}`);
    await page.getByRole("button", { name: t.staffRoles.save }).click();
    await expect(page.getByText(t.staffRoles.saved).first()).toBeVisible({ timeout: 10_000 });

    await verifyReloadPersistence(page, async () => {
      await expect(page.getByRole("link", { name: new RegExp(roleName1) })).toBeVisible({ timeout: 10_000 });
    });

    await page.getByRole("link", { name: new RegExp(roleName1) }).click();
    await expect(page).toHaveURL(new RegExp(`edit=${customRoleId}`), { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: roleName1, level: 2 })).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(t.staffRoles.nameEn).fill(roleName2);
    await page.getByRole("button", { name: t.staffRoles.save }).click();
    await expect(page.getByText(t.staffRoles.saved).first()).toBeVisible({ timeout: 10_000 });
    await verifyReloadPersistence(page, async () => {
      await expect(page.getByRole("link", { name: new RegExp(roleName2) })).toBeVisible({ timeout: 10_000 });
    });

    await page.getByRole("link", { name: new RegExp(roleName2) }).click();
    await expect(page).toHaveURL(new RegExp(`edit=${customRoleId}`), { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: roleName2, level: 2 })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: t.staffRoles.delete }).click();
    const delRoleModal = page.getByRole("alertdialog");
    await expect(delRoleModal).toBeVisible();
    await delRoleModal.locator("input").first().fill("DELETE");
    await delRoleModal.getByRole("button", { name: t.criticalModal.confirm }).click();
    await expect(page.getByRole("link", { name: new RegExp(roleName2) })).toHaveCount(0, { timeout: 10_000 });

    // 6. /sessions: filter by realm + clear filter
    await gotoStrict(page, "/sessions", observer);
    await expect(page.getByRole("heading", { name: t.sessions.title, exact: true })).toBeVisible();
    await selectOption(page.getByRole("combobox", { name: t.sessions.realm, exact: true }), "it");
    await page.getByRole("button", { name: t.sessions.filter, exact: true }).click();
    await expect(page).toHaveURL(/realm=it/);
    await page.getByRole("link", { name: t.sessions.clear, exact: true }).click();

    await observer.assertClean("it-exhaustive-auth-accounts-roles");
  });
});
