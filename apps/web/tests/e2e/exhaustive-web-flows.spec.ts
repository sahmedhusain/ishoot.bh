import { expect, test } from "@playwright/test";
import {
  createStrictObserver,
  gotoStrict,
  mintServiceToken,
} from "./helpers/strict-audit";

test.describe("Web App — Exhaustive 7-Route EN + AR Flows, Validations & Persistence", () => {
  test("EN & AR home pages verify navigation, theme/language switchers, credentials, FAQ accordions, and review CRUD", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const observer = createStrictObserver(page, "web-exhaustive-home");

    // 1. EN home
    await gotoStrict(page, "/en", observer);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator(".site-navbar")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect(page.locator('[data-testid="executive-credentials"]')).toBeVisible();
    await expect(page.locator('[data-testid="executive-cta-banner"]')).toBeVisible();

    // Verify works filter buttons on home work unconditionally
    const homeFilterBtns = page.locator("#portfolio button[aria-pressed]");
    const homeFilterCount = await homeFilterBtns.count();
    expect(homeFilterCount).toBeGreaterThan(1);
    for (let i = 1; i < homeFilterCount; i++) {
      await homeFilterBtns.nth(i).scrollIntoViewIfNeeded();
      await homeFilterBtns.nth(i).click();
      await expect(homeFilterBtns.nth(i)).toHaveAttribute("aria-pressed", "true");
    }
    await homeFilterBtns.first().click();
    await expect(homeFilterBtns.first()).toHaveAttribute("aria-pressed", "true");

    // Toggle all FAQ accordions
    const faqButtons = page.locator("#faq button[aria-expanded]");
    const faqCount = await faqButtons.count();
    expect(faqCount).toBeGreaterThan(0);
    for (let i = 0; i < faqCount; i++) {
      const btn = faqButtons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      const before = await btn.getAttribute("aria-expanded");
      await btn.click();
      const after = await btn.getAttribute("aria-expanded");
      expect(after).not.toBe(before);
    }

    // Review modal: HTML5 empty validation + whitespace custom alert validation + valid submit + backend persistence & cleanup
    const reviewBtn = page
      .getByRole("button", { name: /rate & review us|write a review|leave a review|add review|شاركنا/i })
      .first();
    await reviewBtn.scrollIntoViewIfNeeded();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    // Negative validation on empty + whitespace form
    expect(await dialog.locator("form").evaluate((f: HTMLFormElement) => f.checkValidity())).toBe(false);
    await dialog.locator("input").nth(0).fill("   ");
    await dialog.locator("textarea").fill("   ");
    await dialog.locator('button[type="submit"]').click();
    await expect(
      dialog.locator('[role="alert"], .text-red-400, .text-rose-400, .text-m3-error').first(),
    ).toBeVisible();

    // Valid submission
    const ts = Date.now();
    const author = `Exhaustive Reviewer ${ts}`;
    await dialog.locator("input").nth(0).fill(author);
    await dialog.locator("textarea").fill("Exhaustive E2E review verifying POST /api/reviews and CMS persistence.");
    const [reviewRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/reviews") && r.request().method() === "POST"),
      dialog.locator('button[type="submit"]').click(),
    ]);
    expect(reviewRes.status()).toBe(200);
    await expect(dialog).toContainText(/thank|submitted|success|received/i, { timeout: 10_000 });
    await dialog.locator('button').last().click();
    await expect(dialog).toBeHidden();

    // Verify in CMS backend via Gateway & clean up
    const tok = mintServiceToken("admin");
    const listRes = await page.request.get("http://localhost:8080/v1/cms/reviews?all=true", {
      headers: { Authorization: `Bearer ${tok}` },
    });
    expect(listRes.status()).toBe(200);
    const listJson = (await listRes.json()) as
      | Array<{ id: string; authorEn?: string; author_en?: string }>
      | { items?: Array<{ id: string; authorEn?: string; author_en?: string }> };
    const reviewItems = Array.isArray(listJson) ? listJson : listJson.items ?? [];
    const created = reviewItems.find((r) => (r.authorEn ?? r.author_en) === author);
    expect(created?.id).toBeTruthy();
    const delRes = await page.request.delete(`http://localhost:8080/v1/cms/reviews/${created!.id}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    expect(delRes.status()).toBe(204);

    // 2. Switch to AR via navbar compact switcher and verify RTL & theme toggle
    const compactLang = page.locator('.site-navbar [data-testid="language-switcher-compact"]');
    await compactLang.scrollIntoViewIfNeeded();
    await expect(async () => {
      await compactLang.click();
      await expect(page.locator('.site-navbar [role="menu"]')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await page.locator('.site-navbar [role="menu"] [role="menuitemradio"][lang="ar"]').click();
    await expect(page).toHaveURL(/\/ar/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator('[data-testid="executive-credentials"]')).toBeVisible();

    const appearanceBtn = page.locator('.site-footer [data-testid="appearance-switcher"]');
    await appearanceBtn.scrollIntoViewIfNeeded();
    await expect(async () => {
      await appearanceBtn.click();
      await expect(page.locator('.site-footer [role="menu"]').last()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    const modeItems = page.locator('.site-footer [role="menu"]').last().locator('[role="menuitemradio"]');
    expect(await modeItems.count()).toBeGreaterThanOrEqual(2);
    await modeItems.nth(1).click();
    await expect(page.locator("html")).toHaveAttribute("data-site-mode", "dark");
    await appearanceBtn.click();
    await modeItems.nth(0).click();
    await expect(page.locator("html")).toHaveAttribute("data-site-mode", "light");

    await observer.assertClean("web-exhaustive-home");
  });

  test("EN & AR about, work catalogue + search/sort/filter + detail, news + article detail + RSS, press & unsubscribe", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const observer = createStrictObserver(page, "web-exhaustive-pages");

    for (const locale of ["en", "ar"] as const) {
      const dir = locale === "ar" ? "rtl" : "ltr";

      // About
      await gotoStrict(page, `/${locale}/about`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator("h1, h2").first()).toBeVisible();

      // Work catalogue
      await gotoStrict(page, `/${locale}/work`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator("h1").first()).toBeVisible();

      // Search & clear filters on work catalogue
      const searchInput = page.locator('#main-content input[type="search"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill("ZZZ-NO-MATCH-E2E");
      await searchInput.press("Enter");
      await expect(page).toHaveURL(/[?&]q=ZZZ-NO-MATCH-E2E/);
      const clearBtn = page.locator("#main-content button").filter({ hasText: /clear|مسح/i }).first();
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
      await expect(page).not.toHaveURL(/[?&]q=ZZZ-NO-MATCH-E2E/);

      // Category filter tabs on work catalogue
      const catBtns = page.locator("#main-content button[aria-pressed]");
      const catCount = await catBtns.count();
      expect(catCount).toBeGreaterThan(1);
      await catBtns.nth(1).click();
      await expect(catBtns.nth(1)).toHaveAttribute("aria-pressed", "true");
      await catBtns.first().click();

      // Work item detail
      const firstWorkHref = await page.locator(`a[href^="/${locale}/work/"]`).first().getAttribute("href");
      expect(firstWorkHref).toBeTruthy();
      await gotoStrict(page, firstWorkHref!, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator("h1").first()).toBeVisible();

      // News index & article detail
      await gotoStrict(page, `/${locale}/news`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator("h1").first()).toBeVisible();
      const firstNewsHref = await page
        .locator(`a[href^="/${locale}/news/"]:not([href$="rss.xml"])`)
        .first()
        .getAttribute("href");
      expect(firstNewsHref).toBeTruthy();
      await gotoStrict(page, firstNewsHref!, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator("h1").first()).toBeVisible();

      // RSS feed
      const rssRes = await page.request.get(`/${locale}/news/rss.xml`);
      expect(rssRes.status()).toBe(200);
      expect(await rssRes.text()).toContain("<rss");

      // Press page
      await gotoStrict(page, `/${locale}/press`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator("h1").first()).toBeVisible();

      // Unsubscribe page (invalid token renders clean alert without 5xx)
      await gotoStrict(page, `/${locale}/unsubscribe/invalid-exhaustive-token`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.getByTestId("unsubscribe")).toBeVisible();
      await expect(page.locator('[data-testid="unsubscribe"] [role="alert"]')).toBeVisible();
    }

    await observer.assertClean("web-exhaustive-pages");
  });

  test("EN & AR contact page tests all intent buttons, negative validations, and live CRM inquiry persistence", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const observer = createStrictObserver(page, "web-exhaustive-contact");

    for (const locale of ["en", "ar"] as const) {
      await gotoStrict(page, `/${locale}/contact`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");

      const form = page.locator('form:has(input[name="fullName"])').first();
      await expect(form).toBeVisible();

      // Exercise every intent radio tab unconditionally (inquiry, quote_request, complaint, suggestion, review)
      const intentLabels = form.locator('input[type="radio"][name="intent"]').locator("..");
      const count = await intentLabels.count();
      expect(count).toBe(5);
      for (let i = 0; i < count; i++) {
        await intentLabels.nth(i).click();
        await expect(form.locator('input[type="radio"][name="intent"]').nth(i)).toBeChecked();
      }
      // Switch back to first intent (inquiry)
      await intentLabels.first().click();

      // Validation 1: name + message without email/phone -> alert shown
      await form.locator('input[name="fullName"]').fill(`Validation ${locale}`);
      await form.locator('textarea[name="message"]').fill("Checking missing contact validation.");
      await form.locator('button[type="submit"]').click();
      await expect(page.locator('#contact-error[role="alert"]')).toBeVisible();

      // Validation 2a: invalid email fails HTML5 constraint check
      const emailInput = form.locator('input[name="email"]');
      await emailInput.fill("not-an-email");
      expect(await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false);

      // Validation 2b: structurally partial domain (fails ContactForm TLD regex) -> triggers custom alert
      await emailInput.fill("bad@domain.c");
      await form.locator('button[type="submit"]').click();
      await expect(page.locator('#contact-error[role="alert"]')).toBeVisible();

      // Valid submission
      const ts = Date.now();
      const email = `web-exhaustive-${locale}-${ts}@example.test`;
      await form.locator('input[name="fullName"]').fill(`Exhaustive Contact ${locale} ${ts}`);
      await emailInput.fill(email);
      await form.locator('textarea[name="message"]').fill(`Exhaustive inquiry message (${locale}) ${ts}.`);

      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/inquiry") && r.request().method() === "POST"),
        form.locator('button[type="submit"]').click(),
      ]);
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { success?: boolean; reference?: string };
      expect(body.success).toBe(true);
      expect(body.reference).toBeTruthy();

      // Verify inquiry persisted in CRM backend via Gateway
      const tok = mintServiceToken("admin");
      const inqRes = await page.request.get("http://localhost:8080/v1/sales/tables/inquiry?limit=200", {
        headers: { Authorization: `Bearer ${tok}` },
      });
      expect(inqRes.status()).toBe(200);
      const inqJson = (await inqRes.json()) as
        | Array<{ id: string; email?: string; requester_email?: string; requesterEmail?: string }>
        | { items?: Array<{ id: string; email?: string; requester_email?: string; requesterEmail?: string }> };
      const inqItems = Array.isArray(inqJson) ? inqJson : inqJson.items ?? [];
      const found = inqItems.find((i) => (i.requester_email ?? i.requesterEmail ?? i.email) === email);
      expect(found?.id).toBeTruthy();
    }

    await observer.assertClean("web-exhaustive-contact");
  });
});
