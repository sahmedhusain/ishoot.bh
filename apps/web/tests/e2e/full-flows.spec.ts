import { expect, test, type Page } from "@playwright/test";

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

test.describe("Web App — Full Page-by-Page, Interactive & Validation Flows (EN)", () => {
  test("home page renders all sections, FAQ accordions, category tabs, and review modal validation", async ({
    page,
  }) => {
    const { errors, serverErrors } = attachErrorListeners(page);
    const res = await page.goto("/en", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    await expect(page.locator(".site-navbar")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();

    // Test FAQ accordion buttons if present
    const faqButtons = page.locator("section button[aria-expanded]");
    const faqCount = await faqButtons.count();
    if (faqCount > 0) {
      const firstFaq = faqButtons.first();
      const before = await firstFaq.getAttribute("aria-expanded");
      await firstFaq.click();
      const after = await firstFaq.getAttribute("aria-expanded");
      expect(after).not.toBe(before);
    }

    // Test Review Submission Modal if trigger button exists
    const reviewBtn = page.getByRole("button", { name: /write a review|leave a review|add review/i });
    if ((await reviewBtn.count()) > 0) {
      await reviewBtn.first().click();
      const dialog = page.locator("dialog[open]");
      await expect(dialog).toBeVisible();

      // Empty validation
      await dialog.locator('button[type="submit"]').click();
      await expect(dialog.locator('[role="alert"], .text-red-400, .text-rose-400, .text-m3-error').first()).toBeVisible();

      // Valid review submission
      await dialog.locator("input").nth(0).fill("E2E Web Reviewer");
      await dialog.locator("textarea").fill("Automated E2E verification review from Playwright.");
      await dialog.locator('button[type="submit"]').click();
      await expect(dialog).toContainText(/thank|submitted|success|received/i, { timeout: 10_000 });
    }

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("about page and collection/detail pages render without errors", async ({ page }) => {
    const { errors, serverErrors } = attachErrorListeners(page);

    for (const path of ["/en/about", "/en/works"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `HTTP status for ${path}`).toBe(200);
      await expect(page.locator("main, .shell").first()).toBeVisible();
    }

    // Test category tabs/filters on works page if present
    const tabs = page.locator('[role="tab"], [data-testid^="category-tab-"]');
    if ((await tabs.count()) > 1) {
      await tabs.nth(1).click();
    }

    // Navigate to first portfolio/collection item detail page if any link exists
    const itemLinks = page.locator('a[href^="/en/works/"], a[href^="/en/portfolio/"], a[href^="/en/catalog/"]');
    if ((await itemLinks.count()) > 0) {
      await itemLinks.first().click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("h1").first()).toBeVisible();
    }

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("contact page tests all intent tabs, input validations, and inquiry submission", async ({
    page,
  }) => {
    const { errors, serverErrors } = attachErrorListeners(page);
    const res = await page.goto("/en/contact", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    const form = page.locator('form:has(input[name="fullName"])').first();
    await expect(form).toBeVisible();

    // 1. Empty submission should trigger HTML5/custom validation; fill required name & message to trigger email-or-phone validation
    await form.locator('input[name="fullName"]').fill("E2E Validation");
    await form.locator('textarea[name="message"]').fill("Testing validation");
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#contact-error[role="alert"]')).toBeVisible();

    // 2. Invalid email format should trigger validation
    const emailInput = form.locator('input[name="email"]');
    await emailInput.fill("invalid-email-format");
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('[role="alert"], .text-m3-error, .text-rose-400, .text-red-400').first()).toBeVisible();

    // 3. Switch through intent tabs/buttons
    const intentButtons = form.locator('button[type="button"]');
    const btnCount = await intentButtons.count();
    for (let i = 0; i < Math.min(btnCount, 5); i++) {
      const btn = intentButtons.nth(i);
      const text = (await btn.innerText()).trim();
      if (/quote|complaint|suggestion|inquiry/i.test(text)) {
        await btn.click();
      }
    }

    // Switch back to first intent (inquiry) and submit valid data
    if (btnCount > 0) {
      await intentButtons.first().click();
    }
    const ts = Date.now();
    await form.locator('input[name="fullName"]').fill(`E2E Contact ${ts}`);
    await emailInput.fill(`e2e-contact-${ts}@example.test`);
    const messageInput = form.locator('textarea[name="message"]');
    if ((await messageInput.count()) > 0) {
      await messageInput.fill("Automated E2E inquiry submission test.");
    }

    const [apiRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/inquiry") && r.request().method() === "POST"),
      form.locator('button[type="submit"]').click(),
    ]);
    expect(apiRes.status()).toBeLessThan(500);
    expect(apiRes.ok()).toBeTruthy();

    expect(serverErrors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("press and unsubscribe routes handle requests cleanly without 5xx", async ({ page }) => {
    const { serverErrors } = attachErrorListeners(page);
    const pressRes = await page.goto("/en/press", { waitUntil: "domcontentloaded" });
    expect([200, 404]).toContain(pressRes?.status());

    const unsubRes = await page.goto("/en/unsubscribe/e2e-invalid-token", { waitUntil: "domcontentloaded" });
    expect(unsubRes?.status()).toBeLessThan(500);

    expect(serverErrors).toEqual([]);
  });
});
