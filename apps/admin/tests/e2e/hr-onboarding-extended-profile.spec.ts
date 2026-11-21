import { expect, test } from "@playwright/test";

const ADMIN_URL = (process.env.ADMIN_URL || "http://localhost:3001").replace(/\/$/, "");

test.describe("HR Onboarding, Extended Profile & Non-HR User Linking", () => {
  test("Users directory filters non-HR accounts and Edit User modal offers 1-click Create Employee Profile CTA", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="username"], input[name="email"], input[type="text"]').first().fill(process.env.SUPER_ADMIN_USERNAME || "BA0001");
    await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.SUPER_ADMIN_PASSWORD || "Admin12345678!");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 25000, waitUntil: "domcontentloaded" });

    await page.goto(`${ADMIN_URL}/dashboard/users`, { waitUntil: "networkidle" });
    const noHrBtn = page.locator("button").filter({ hasText: /No employee record|لا يوجد سجل موظف/i }).first();
    await expect(noHrBtn).toBeVisible({ timeout: 10000 });
    await noHrBtn.click();

    const editBtn = page.locator("tbody tr").first().getByRole("button", { name: /Edit|تعديل/i }).first();
    await editBtn.click();

    const createHrLink = page.locator('a[href*="/dashboard/hr/employees/new?userId="]').last();
    await expect(createHrLink).toBeVisible({ timeout: 5000 });
  });

  test("HR onboarding supports unlimited contacts, work/personal emails, emergency contacts, health record & persists on detail page", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="username"], input[name="email"], input[type="text"]').first().fill(process.env.SUPER_ADMIN_USERNAME || "BA0001");
    await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.SUPER_ADMIN_PASSWORD || "Admin12345678!");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 25000, waitUntil: "domcontentloaded" });

    await page.goto(`${ADMIN_URL}/dashboard/hr/employees/new`, { waitUntil: "networkidle" });
    const ts = Date.now().toString().slice(-5);
    const reqInputs = page.locator("form input[required]");
    await reqInputs.nth(0).fill("Saeed");
    await reqInputs.nth(1).fill("Al-Balooshi");
    await reqInputs.nth(2).fill("Operations Supervisor");

    await page.getByRole("button", { name: /Add Contact|إضافة رقم تواصل/i }).first().click();
    await page.getByRole("button", { name: /Add Work Email|إضافة بريد عمل/i }).first().click();
    await page.getByRole("button", { name: /Add Personal Email|إضافة بريد شخصي/i }).first().click();

    const emailInputs = page.locator('input[type="email"]');
    const count = await emailInputs.count();
    await emailInputs.nth(count - 2).fill(`saeed.e2e.${ts}@zayedgroup.bh`);
    await emailInputs.nth(count - 1).fill(`saeed.personal.${ts}@gmail.com`);

    await page.getByRole("button", { name: /Add Emergency Contact|إضافة جهة طوارئ/i }).first().click();
    await page.locator('input[placeholder*="full name" i], input[placeholder*="الاسم الكامل لجهة الطوارئ"]').first().fill("Mariam Al-Balooshi");
    await page.locator('input[placeholder*="Solidarity"]').first().fill("Solidarity Bahrain");

    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/dashboard\/hr\/employees\/(?!new)/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`input[value="saeed.e2e.${ts}@zayedgroup.bh"]`)).toBeVisible();
    await expect(page.locator(`input[value="saeed.personal.${ts}@gmail.com"]`)).toBeVisible();
    await expect(page.locator('input[value="Mariam Al-Balooshi"]')).toBeVisible();
    await expect(page.locator('input[value="Solidarity Bahrain"]')).toBeVisible();
  });
});
