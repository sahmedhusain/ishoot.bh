import { expect, test } from "@playwright/test";
import { admin } from "./helpers/helpers";

test.describe("Admin Architecture, Auth & Go Gateway API", () => {
  test("redirects unauthenticated traffic, shows alert on invalid login, signs in, enforces non-circular cards, and verifies Go CMS CRUD", async ({
    page,
    context,
    request,
  }) => {
    await context.clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);

    const usernameField = page.locator("#login-username:visible");
    const passwordField = page.locator("#login-password:visible");
    const submitButton = page.locator('button[type="submit"]:visible');

    await expect(usernameField).toBeVisible();
    await usernameField.fill(admin.username);
    await passwordField.fill("WrongPass123!");
    await submitButton.click();
    await expect(page.locator('[role="alert"]#login-error:visible')).toBeVisible();

    await usernameField.fill(admin.username);
    await passwordField.fill(admin.password);
    await submitButton.click();
    await expect(page).not.toHaveURL(/\/login/);

    const accessCookie = (await context.cookies()).find((c) => c.name === "platform_admin_access");
    expect(accessCookie?.value).toBeTruthy();

    const cardRadius = await page.evaluate(() => {
      document.documentElement.setAttribute("data-corners", "rounded");
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(".admin-card, .rounded-xl, .rounded-2xl"),
      );
      return candidates
        .slice(0, 10)
        .map((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    });
    expect(cardRadius.length).toBeGreaterThan(0);
    for (const r of cardRadius) {
      expect(r).toBeLessThanOrEqual(32);
    }

    const gatewayUrl = process.env.API_URL || "http://localhost:8080";
    await page.goto("/dashboard/cms/faqs");
    await expect(page).not.toHaveURL(/\/login/);

    const uniqueSuffix = String(Date.now());
    const questionEn = `E2E FAQ Question ${uniqueSuffix}?`;
    const questionAr = `سؤال اختبار ${uniqueSuffix}؟`;
    const updatedSuffix = `${uniqueSuffix}-v2`;
    const updatedQuestionEn = `E2E FAQ Updated ${updatedSuffix}?`;
    const updatedQuestionAr = `سؤال اختبار محدث ${updatedSuffix}؟`;

    let createdId: string | undefined;
    try {
      await page.getByRole("button", { name: /new faq|إضافة سؤال جديد/i }).click();
      await page.locator('input[name="questionEn"]').fill(questionEn);
      if ((await page.locator('input[name="questionAr"]').count()) > 0) {
        await page.locator('input[name="questionAr"]').fill(questionAr);
      }
      await page.locator('textarea[name="answerEn"]').fill("Automated E2E verification answer.");
      if ((await page.locator('textarea[name="answerAr"]').count()) > 0) {
        await page.locator('textarea[name="answerAr"]').fill("إجابة تحقق تلقائية.");
      }

      await page.locator('button[type="submit"][form]').click();

      const createdCard = page.locator('#admin-main [data-ui="card"]', { hasText: uniqueSuffix });
      await expect(createdCard).toBeVisible({ timeout: 20_000 });

      const listRes = await request.get(`${gatewayUrl}/v1/cms/faqs?all=true`);
      expect(listRes.status()).toBe(200);
      const list = (await listRes.json()) as { id: string; questionEn: string }[];
      const created = list.find((item) => item.questionEn === questionEn);
      expect(created?.id).toBeTruthy();
      createdId = created!.id;

      await createdCard.locator('button[aria-label="Edit"], button[aria-label="تعديل"]').click();
      await page.locator('input[name="questionEn"]').fill(updatedQuestionEn);
      if ((await page.locator('input[name="questionAr"]').count()) > 0) {
        await page.locator('input[name="questionAr"]').fill(updatedQuestionAr);
      }
      await page.locator('button[type="submit"][form]').click();

      const updatedCard = page.locator('#admin-main [data-ui="card"]', { hasText: updatedSuffix });
      await expect(updatedCard).toBeVisible({ timeout: 20_000 });

      const afterUpdateRes = await request.get(`${gatewayUrl}/v1/cms/faqs?all=true`);
      expect(afterUpdateRes.status()).toBe(200);
      const afterUpdate = (await afterUpdateRes.json()) as { id: string; questionEn: string }[];
      expect(afterUpdate.some((item) => item.id === createdId && item.questionEn === updatedQuestionEn)).toBe(true);

      await updatedCard.locator('button[aria-label="Delete"], button[aria-label="حذف"]').click();
      await page.getByRole("button", { name: /^confirm$|^تأكيد$/i }).click();
      await expect(updatedCard).toBeHidden({ timeout: 20_000 });

      const afterDeleteRes = await request.get(`${gatewayUrl}/v1/cms/faqs?all=true`);
      expect(afterDeleteRes.status()).toBe(200);
      const afterDelete = (await afterDeleteRes.json()) as { id: string }[];
      expect(afterDelete.some((item) => item.id === createdId)).toBe(false);
    } finally {
      if (createdId) {
        const cleanupCard = page.locator('#admin-main [data-ui="card"]', { hasText: uniqueSuffix });
        if ((await cleanupCard.count()) > 0) {
          await cleanupCard.first().locator('button[aria-label="Delete"], button[aria-label="حذف"]').click();
          await page.getByRole("button", { name: /^confirm$|^تأكيد$/i }).click();
        }
      }
    }
  });
});
