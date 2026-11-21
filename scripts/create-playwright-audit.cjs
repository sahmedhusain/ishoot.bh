const fs = require("node:fs");
const path = require("node:path");
const { types } = require("node:util");
const core = require("./qa-strict-core.cjs");

function matchesRule(rule, status, url) {
  const statuses = Array.isArray(rule.status) ? rule.status : rule.status != null ? [rule.status] : null;
  if (statuses && !statuses.includes(status)) return false;
  if (rule.urlPattern) {
    const re = types.isRegExp(rule.urlPattern) ? rule.urlPattern : new RegExp(String(rule.urlPattern));
    if (!re.test(url)) return false;
  }
  return true;
}

function createPlaywrightAudit(expect) {
  function createStrictObserver(page, suiteName) {
    core.resetSuiteLog(suiteName);
    const errors = [];
    const unexpectedHttp = [];
    const allowedRules = [];
    const requests = [];

    const NEXT_DEV_PERF_MEASURE_RE =
      /Failed to execute 'measure' on 'Performance': .* cannot have a negative time stamp/i;
    const onPageError = (err) => {
      const rawMsg = err?.message || String(err);
      if (NEXT_DEV_PERF_MEASURE_RE.test(rawMsg)) return;
      const msg = `pageerror (${page.url()}): ${rawMsg}`;
      errors.push(msg);
      core.appendJsonlLog(suiteName, { type: "pageerror", url: page.url(), message: msg });
    };

    const onConsole = (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (
        /favicon|Download the React DevTools|\[Fast Refresh\]|webpack-hmr|_next\/webpack|ERR_ABORTED/i.test(text)
      ) {
        return;
      }
      const isHydration =
        /Hydration failed|Text content does not match|There was an error while hydrating|did not match\. Server:/i.test(
          text,
        );
      if (isHydration) {
        const entry = `hydration_error (${page.url()}): ${text}`;
        errors.push(entry);
        core.appendJsonlLog(suiteName, { type: "hydration_error", url: page.url(), message: text });
        return;
      }
      if (type === "error") {
        // Check if browser logged "Failed to load resource: the server responded with a status of 4xx" for an explicitly allowed failure
        const statusMatch = text.match(/status of (\d{3})/);
        if (statusMatch) {
          const code = Number(statusMatch[1]);
          const locUrl = msg.location()?.url || page.url();
          if (allowedRules.some((r) => matchesRule(r, code, locUrl))) {
            return;
          }
        }
        const entry = `console.error (${page.url()}): ${text}`;
        errors.push(entry);
        core.appendJsonlLog(suiteName, { type: "console_error", url: page.url(), message: text });
      }
    };

    const onResponse = (res) => {
      const status = res.status();
      const req = res.request();
      const method = req.method();
      const url = res.url();
      const isAllowed = status >= 400 && allowedRules.some((r) => matchesRule(r, status, url));
      if (isAllowed) {
        for (const r of allowedRules) {
          if (matchesRule(r, status, url)) r.hitCount++;
        }
      }
      const record = {
        type: "response",
        method,
        url,
        status,
        resourceType: req.resourceType(),
        isServerAction: Boolean(req.headers()["next-action"]),
        allowed: isAllowed,
      };
      requests.push(record);
      if (url.includes("/api/") || url.includes("/v1/") || record.isServerAction || req.resourceType() === "document" || status >= 400) {
        core.appendJsonlLog(suiteName, record);
      }
      if (status >= 400 && !isAllowed) {
        unexpectedHttp.push(`${status} ${method} ${url} (on ${page.url()})`);
      }
    };

    page.on("pageerror", onPageError);
    page.on("console", onConsole);
    page.on("response", onResponse);

    return {
      suiteName,
      errors,
      unexpectedHttp,
      requests,
      allowedRules,
      clear() {
        errors.length = 0;
        unexpectedHttp.length = 0;
      },
      async assertClean(contextLabel = "") {
        // Check images on current document without mutating React-controlled DOM attributes (e.g. loading="lazy")
        const currentUrl = page.url();
        if (currentUrl && currentUrl !== "about:blank") {
          const snapshot = await page
            .evaluate(async () => {
              const imgs = Array.from(document.images);
              await Promise.all(
                imgs
                  .filter((img) => !img.complete && img.loading !== "lazy")
                  .map(
                    (img) =>
                      new Promise((resolve) => {
                        img.addEventListener("load", resolve, { once: true });
                        img.addEventListener("error", resolve, { once: true });
                        setTimeout(resolve, 4000);
                      }),
                  ),
              );
              const brokenLoaded = imgs
                .filter((img) => img.complete && img.currentSrc && img.naturalWidth === 0)
                .map((img) => img.currentSrc);
              const lazyPending = Array.from(
                new Set(
                  imgs
                    .filter((img) => !img.complete && (img.currentSrc || img.src))
                    .map((img) => img.currentSrc || img.src)
                    .filter((src) => /^https?:\/\//.test(src) || src.startsWith("/")),
                ),
              );
              return { brokenLoaded, lazyPending };
            })
            .catch(() => ({ brokenLoaded: [], lazyPending: [] }));
          const broken = [...(snapshot.brokenLoaded || [])];
          for (const src of snapshot.lazyPending || []) {
            const target = src.startsWith("/") ? new URL(src, currentUrl).href : src;
            const res = await page.request.get(target).catch(() => null);
            if (!res || res.status() >= 400) {
              broken.push(`${src} (status=${res ? res.status() : "network_error"})`);
            }
          }
          for (const src of broken) {
            const msg = `broken_image (${currentUrl}): ${src}`;
            errors.push(msg);
            core.appendJsonlLog(suiteName, { type: "broken_image", url: currentUrl, src });
          }
        }
        const prefix = contextLabel ? `[${contextLabel}] ` : "";
        expect(unexpectedHttp, `${prefix}Unexpected HTTP >=400 responses:\n${unexpectedHttp.join("\n")}`).toEqual([]);
        expect(errors, `${prefix}Browser/DOM/Image errors:\n${errors.join("\n")}`).toEqual([]);
      },
    };
  }

  async function allowExpectedFailure(observer, rule, fn) {
    const entry = {
      status: rule.status,
      urlPattern: rule.urlPattern,
      hitCount: 0,
    };
    observer.allowedRules.push(entry);
    try {
      return await fn();
    } finally {
      const idx = observer.allowedRules.indexOf(entry);
      if (idx !== -1) observer.allowedRules.splice(idx, 1);
      if (rule.requireHit !== false) {
        expect(
          entry.hitCount,
          `Expected negative test failure matching status=${JSON.stringify(rule.status)} url=${String(rule.urlPattern)} but none occurred`,
        ).toBeGreaterThan(0);
      }
    }
  }

  async function auditAllTabs(page, options = {}) {
    const tabs = page.locator('[role="tab"]:visible');
    const count = await tabs.count();
    if (options.minTabs != null) {
      expect(count, `Expected at least ${options.minTabs} visible tabs on ${page.url()}`).toBeGreaterThanOrEqual(
        options.minTabs,
      );
    }
    const visitedLabels = [];
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      const label = ((await tab.innerText().catch(() => "")) || (await tab.getAttribute("aria-label")) || `tab-${i}`).trim();
      await tab.scrollIntoViewIfNeeded();
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForLoadState("domcontentloaded");
      const selected = await tab.getAttribute("aria-selected");
      if (selected !== null) {
        await expect(tab, `Tab "${label}" did not become aria-selected="true"`).toHaveAttribute("aria-selected", "true", {
          timeout: 10_000,
        });
      }
      visitedLabels.push(label);
    }
    return visitedLabels;
  }

  async function verifyReloadPersistence(page, assertFn) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertFn();
  }

  async function gotoStrict(page, route, observer) {
    const res = await page.goto(route, { waitUntil: "load" });
    expect(res, `No response navigating to ${route}`).not.toBeNull();
    expect(res.status(), `HTTP status on ${route}`).toBeLessThan(400);
    await expect(page.locator("main, h1, h2, [role='main']").first(), `Main content on ${route}`).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    if (observer) {
      await observer.assertClean(route);
    }
    return res;
  }

  async function loginAsAdminStrict(page, creds = null) {
    const env = core.loadRootEnv();
    const username = creds?.username || env.SUPER_ADMIN_USERNAME || "BA0001";
    const password = creds?.password || env.SUPER_ADMIN_PASSWORD || "Admin12345678!";

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    // Switch login screen to English if currently Arabic so English labels/assertions are deterministic
    const engBtn = page.getByRole("button", { name: /^English$/i });
    if (await engBtn.isVisible().catch(() => false)) {
      await engBtn.click();
      await page.waitForTimeout(200);
    }

    const usernameInput = page.locator("#login-username");
    const passwordInput = page.locator("#login-password");
    await expect(usernameInput).toBeVisible({ timeout: 15_000 });
    await expect(passwordInput).toBeVisible({ timeout: 15_000 });

    await usernameInput.fill(username);
    await passwordInput.fill(password);

    const [loginRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"),
      page.locator('button[type="submit"]:visible').click(),
    ]);
    expect(loginRes.status(), `Admin login API status for ${username}`).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 });
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  function loadItAccount() {
    const accountFile = path.resolve(
      process.env.E2E_IT_ACCOUNT_FILE || path.join(core.ROOT, "apps/it/tests/.results/it-account.json"),
    );
    if (!fs.existsSync(accountFile)) {
      throw new Error(`IT account file missing at ${accountFile}. Run node apps/it/tests/e2e/helpers/it-account.cjs`);
    }
    const parsed = JSON.parse(fs.readFileSync(accountFile, "utf8"));
    return {
      ...parsed,
      username: parsed.username || core.loadRootEnv().IT_ADMIN_USERNAME || "BA0001",
    };
  }

  async function loginToItStrict(page, account = null) {
    const acc = account || loadItAccount();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const usernameField = page.locator('input[name="username"]');
    const passwordField = page.locator('input[name="password"]');
    await expect(usernameField).toBeVisible({ timeout: 15_000 });
    await usernameField.fill(acc.username);
    await passwordField.fill(acc.password);
    await page.locator('button[type="submit"]:visible').click();

    const otpField = page.locator('input[name="otp"]');
    await expect(otpField).toBeVisible({ timeout: 15_000 });
    const { code } = await core.acquireItTotp(acc.secret);
    await otpField.fill(code);
    await page.locator('button[type="submit"]:visible').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 25_000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    return acc;
  }

  return {
    ...core,
    createStrictObserver,
    allowExpectedFailure,
    auditAllTabs,
    verifyReloadPersistence,
    gotoStrict,
    loginAsAdminStrict,
    loadItAccount,
    loginToItStrict,
  };
}

module.exports = { createPlaywrightAudit };
