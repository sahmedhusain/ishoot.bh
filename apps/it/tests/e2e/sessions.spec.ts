import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  createITAccountForIT,
  listAuditEvents,
  listIdentitySessionsForIT,
  updateITAccountForIT,
} from "@platform/api-client";
import ar from "@platform/locales/ar.json";
import en from "@platform/locales/en.json";
import { ports } from "../../../../playwright.config";
import { selectOption } from "../../select-option";
import { totp } from "../../totp";

test("IT lists, filters and revokes sessions with bilingual confirmation and live invalidation", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180_000);
  const accountFile = path.resolve(
    process.env.E2E_IT_ACCOUNT_FILE ||
      path.join(__dirname, "../../.results/it-account.json"),
  );
  test.skip(
    !fs.existsSync(accountFile),
    "run node tests/e2e/it-account.cjs first",
  );
  const account = JSON.parse(fs.readFileSync(accountFile, "utf8")) as {
    email: string;
    password: string;
    secret: string;
  };
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/login");
  await page.getByLabel(ar.login.email).fill(account.email);
  await page.getByLabel(ar.login.password).fill(account.password);
  await page.getByRole("button", { name: ar.login.submit }).click();
  // Another serial IT journey may have consumed the current authenticator step.
  const step = Math.floor(Date.now() / 30_000);
  await expect
    .poll(() => Math.floor(Date.now() / 30_000), {
      timeout: 35_000,
      intervals: [250],
    })
    .toBeGreaterThan(step);
  await page.getByLabel(ar.login.otp).fill(totp(account.secret));
  await page.getByRole("button", { name: ar.login.verify }).click();
  await expect(page).toHaveURL(/\/$/);
  const accessCookie = process.env.IT_ACCESS_COOKIE || "platform_it_access";
  const rootToken = (await context.cookies()).find(
    (cookie) => cookie.name === accessCookie,
  )!.value;
  const root = JSON.parse(
    Buffer.from(rootToken.split(".")[1], "base64url").toString(),
  ) as { sub: string; sid: string };
  const email = `it-session-${randomUUID()}@example.test`,
    password = randomUUID() + randomUUID();
  const created = await createITAccountForIT(rootToken, {
    email,
    password,
    role: "it_engineer",
  });
  const guest = await browser.newContext({
    baseURL: `http://localhost:${ports.it}`,
    timezoneId: "Pacific/Honolulu",
  });
  try {
    const other = await guest.newPage();
    other.on("pageerror", (error) => pageErrors.push(error.message));
    await other.goto("/login");
    await other.getByLabel(ar.login.email).fill(email);
    await other.getByLabel(ar.login.password).fill(password);
    await other.getByRole("button", { name: ar.login.submit }).click();
    await other.getByLabel(ar.login.otp).fill(totp(created.secret));
    await other.getByRole("button", { name: ar.login.verify }).click();
    await expect(other).toHaveURL(/\/$/);
    const guestToken = (await guest.cookies()).find(
      (cookie) => cookie.name === accessCookie,
    )!.value;
    const { items } = await listIdentitySessionsForIT(rootToken, {
      realm: "it",
      subjectId: created.subjectId,
    });
    expect(items).toHaveLength(1);
    const id = items[0].id;
    await other.goto(
      `/sessions?realm=it&realm=staff&subjectId=${created.subjectId}&subjectId=ignored&cursor=&cursor=invalid`,
    );
    await expect(
      other.getByRole("heading", { name: ar.sessions.title, exact: true }),
    ).toBeVisible();
    await expect(
      other.getByRole("button", { name: ar.sessions.revoke, exact: true }),
    ).toHaveCount(0);
    const localDate = await other.evaluate(
      (value) =>
        new Intl.DateTimeFormat("ar-u-nu-latn", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value)),
      items[0].createdAt,
    );
    await expect(other.getByTestId(`identity-session-${id}`)).toContainText(
      localDate,
    );

    for (const copy of [ar, en]) {
      await page.setViewportSize({
        width: copy === ar ? 390 : 1280,
        height: 900,
      });
      if (copy === en) {
        await page
          .getByRole("button", { name: ar.app.language, exact: true })
          .click();
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
      }
      await page
        .getByRole("link", { name: copy.nav.sessions, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: copy.sessions.title, exact: true }),
      ).toBeVisible();
      await selectOption(
        page.getByRole("combobox", { name: copy.sessions.realm, exact: true }),
        "it",
      );
      await page
        .getByLabel(copy.sessions.accountId, { exact: true })
        .fill(created.subjectId);
      await page
        .getByRole("button", { name: copy.sessions.filter, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`subjectId=${created.subjectId}`),
      );
      const row = page.getByRole("main").getByTestId(`identity-session-${id}`);
      await expect(row).toContainText(email);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await row
        .getByRole("button", { name: copy.sessions.revoke, exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: copy.sessions.confirmTitle,
        exact: true,
      });
      await expect(dialog).toContainText(copy.sessions.confirmBody);
      await dialog
        .getByRole("button", { name: copy.sessions.cancel, exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(row).toContainText(copy.sessions.active);
      if (copy === ar) {
        await page.route("**/sessions*", (route) =>
          route.request().method() === "POST"
            ? route.fulfill({ status: 500, body: "E2E revocation failure" })
            : route.continue(),
        );
        await row
          .getByRole("button", { name: copy.sessions.revoke, exact: true })
          .click();
        await dialog
          .getByRole("button", { name: copy.sessions.revoke, exact: true })
          .click();
        await expect(dialog.getByRole("alert")).toHaveText(
          copy.sessions.failed,
        );
        await page.unroute("**/sessions*");
        await dialog
          .getByRole("button", { name: copy.sessions.cancel, exact: true })
          .click();
        expect(
          (
            await other.request.get(
              `${process.env.API_URL}/v1/identity/session`,
              { headers: { Authorization: `Bearer ${guestToken}` } },
            )
          ).status(),
        ).toBe(204);
      }
    }
    const target = page.getByRole("main").getByTestId(`identity-session-${id}`);
    await target
      .getByRole("button", { name: en.sessions.revoke, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: en.sessions.revoke, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      target.getByText(en.sessions.revoked, { exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await listAuditEvents(rootToken, {
              subject: "identity.session.revoked",
              actor: `it:${root.sub}`,
            })
          ).items.some((event) => event.payload.sessionId === id),
        { timeout: 30_000 },
      )
      .toBe(true);
    expect(
      (
        await other.request.get(`${process.env.API_URL}/v1/identity/session`, {
          headers: { Authorization: `Bearer ${guestToken}` },
        })
      ).status(),
    ).toBe(401);
    // With access removed, middleware must reject the revoked refresh credential too.
    await guest.clearCookies({ name: accessCookie });
    await other.goto("/tickets");
    await expect(other).toHaveURL(/\/login$/);
    await updateITAccountForIT(rootToken, created.subjectId, {
      role: "it_engineer",
      active: false,
    });
    let cursor = "";
    for (;;) {
      const own = await listIdentitySessionsForIT(rootToken, {
        realm: "it",
        subjectId: root.sub,
        cursor: cursor || undefined,
      });
      if (own.items.some((session) => session.id === root.sid)) break;
      expect(own.nextCursor).not.toBe("");
      cursor = own.nextCursor;
    }
    await page.goto(
      `/sessions?realm=it&subjectId=${root.sub}&cursor=${cursor}`,
    );
    const current = page
      .getByRole("main")
      .getByTestId(`identity-session-${root.sid}`);
    await expect(current).toContainText(en.sessions.current);
    await current
      .getByRole("button", { name: en.sessions.revoke, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: en.sessions.revoke, exact: true })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      (await context.cookies()).filter((cookie) =>
        [
          accessCookie,
          process.env.IT_REFRESH_COOKIE || "platform_it_refresh",
          process.env.IT_ACCOUNT_COOKIE || "platform_it_account",
        ].includes(cookie.name),
      ),
    ).toHaveLength(0);
    expect(pageErrors).toEqual([]);
  } finally {
    await updateITAccountForIT(rootToken, created.subjectId, {
      role: "it_engineer",
      active: false,
    }).catch(() => undefined);
    await guest.close();
  }
});
