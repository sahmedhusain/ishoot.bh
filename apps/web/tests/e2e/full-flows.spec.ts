import { expect, test, type Page } from "@playwright/test";
import { mintServiceToken } from "./helpers/strict-audit";

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
    const res = await page.goto("/en", { waitUntil: "load" });
    expect(res?.status()).toBe(200);

    await expect(page.locator(".site-navbar")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();

    // Test FAQ accordion buttons unconditionally
    const faqButtons = page.locator("#faq button[aria-expanded]");
    const faqCount = await faqButtons.count();
    expect(faqCount).toBeGreaterThan(0);
    const firstFaq = faqButtons.first();
    await firstFaq.scrollIntoViewIfNeeded();
    const before = await firstFaq.getAttribute("aria-expanded");
    await firstFaq.click();
    await expect(firstFaq).not.toHaveAttribute("aria-expanded", before || "");

    // Test Review Submission Modal unconditionally + clean up created review
    const reviewBtn = page.getByRole("button", { name: /rate & review us|write a review|leave a review|add review|شاركنا/i });
    expect(await reviewBtn.count()).toBeGreaterThan(0);
    await reviewBtn.first().click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // Native HTML5 empty validation + whitespace custom alert validation
    expect(await dialog.locator("form").evaluate((f: HTMLFormElement) => f.checkValidity())).toBe(false);
    await dialog.locator("input").nth(0).fill("   ");
    await dialog.locator("textarea").fill("   ");
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.locator('[role="alert"], .text-red-400, .text-rose-400, .text-m3-error').first()).toBeVisible();

    // Valid review submission
    const reviewerName = `E2E Web Reviewer ${Date.now()}`;
    await dialog.locator("input").nth(0).fill(reviewerName);
    await dialog.locator("textarea").fill("Automated E2E verification review from Playwright.");
    const [reviewPostRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/reviews") && r.request().method() === "POST"),
      dialog.locator('button[type="submit"]').click(),
    ]);
    expect(reviewPostRes.status()).toBe(200);
    await expect(dialog).toContainText(/thank|submitted|success|received/i, { timeout: 10_000 });

    const tok = mintServiceToken("admin");
    const listRes = await page.request.get("http://localhost:8080/v1/cms/reviews?all=true", {
      headers: { Authorization: `Bearer ${tok}` },
    });
    expect(listRes.status()).toBe(200);
    const listBody = (await listRes.json()) as
      | Array<{ id: string; authorEn?: string; author_en?: string }>
      | { items?: Array<{ id: string; authorEn?: string; author_en?: string }> };
    const reviewItems = Array.isArray(listBody) ? listBody : listBody.items ?? [];
    const createdReview = reviewItems.find((r) => (r.authorEn ?? r.author_en) === reviewerName);
    expect(createdReview?.id).toBeTruthy();
    const delRes = await page.request.delete(`http://localhost:8080/v1/cms/reviews/${createdReview!.id}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    expect(delRes.status()).toBe(204);

    expect(serverErrors, `Server 5xx errors: ${serverErrors.join(", ")}`).toEqual([]);
    expect(errors, `Browser errors: ${errors.join(", ")}`).toEqual([]);
  });

  test("about page and collection/detail pages render without errors", async ({ page }) => {
    const { errors, serverErrors } = attachErrorListeners(page);

    for (const path of ["/en/about", "/en/work"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `HTTP status for ${path}`).toBe(200);
      await expect(page.locator("main, .shell").first()).toBeVisible();
    }

    // Test category filter buttons/tabs on work page unconditionally
    const tabs = page.locator('[role="tab"], [data-testid^="category-tab-"], #main-content button[aria-pressed]');
    expect(await tabs.count()).toBeGreaterThan(1);
    await tabs.nth(1).click();

    // Navigate to first portfolio/collection item detail page unconditionally
    const itemLinks = page.locator('a[href^="/en/work/"]');
    expect(await itemLinks.count()).toBeGreaterThan(0);
    await itemLinks.first().click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1").first()).toBeVisible();

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

    // 3. Switch through ALL intent radio tabs
    const intentLabels = form.locator('input[type="radio"][name="intent"]').locator("..");
    const btnCount = await intentLabels.count();
    expect(btnCount).toBe(5);
    for (let i = 0; i < btnCount; i++) {
      await intentLabels.nth(i).click();
    }

    // Switch back to first intent (inquiry) and submit valid data
    await intentLabels.first().click();
    const ts = Date.now();
    await form.locator('input[name="fullName"]').fill(`E2E Contact ${ts}`);
    await emailInput.fill(`e2e-contact-${ts}@example.test`);
    const messageInput = form.locator('textarea[name="message"]');
    expect(await messageInput.count()).toBeGreaterThan(0);
    await messageInput.fill("Automated E2E inquiry submission test.");

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
    expect(pressRes?.status()).toBe(200);

    const unsubRes = await page.goto("/en/unsubscribe/e2e-invalid-token", { waitUntil: "domcontentloaded" });
    expect(unsubRes?.status()).toBe(200);

    expect(serverErrors).toEqual([]);
  });
});
