import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import enLocale from "../../../locales/en.json";
import arLocale from "../../../locales/ar.json";
import {
  LOGS_DIR,
  auditAllTabs,
  createStrictObserver,
  gotoStrict,
  loadRootEnv,
  mintServiceToken,
} from "./strict-audit";

export const en = enLocale.admin;
export const ar = arLocale.admin;
export const ADMIN_PAGES_LOG = path.join(LOGS_DIR, "playwright-admin-pages.jsonl");

export async function switchAdminLocale(page: Page, locale: "en" | "ar") {
  await page.evaluate((loc) => {
    localStorage.setItem("platform_admin_locale", loc);
    document.cookie = `platform_admin_locale=${loc}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, locale);
}

export function resetAdminPagesLog() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(ADMIN_PAGES_LOG, "");
}

export function recordVisitedRoute(
  routeTemplate: string,
  concretePath: string,
  status: number,
  tabCount: number,
  locale: "en" | "ar" = "en",
) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.appendFileSync(
    ADMIN_PAGES_LOG,
    JSON.stringify({
      ts: new Date().toISOString(),
      route: routeTemplate,
      concretePath,
      status,
      tabCount,
      locale,
      errors: 0,
    }) + "\n",
  );
}

export interface VisitAuditOptions {
  locale?: "en" | "ar";
  expectedUrl?: RegExp;
  assertNoOverflow?: boolean;
}

export async function visitAndAuditRoute(
  page: Page,
  observer: ReturnType<typeof createStrictObserver>,
  routeTemplate: string,
  concretePath: string = routeTemplate,
  options: VisitAuditOptions = {},
) {
  const res = await gotoStrict(page, concretePath, observer);
  if (options.expectedUrl) {
    await expect(page, `Expected URL after visiting ${concretePath}`).toHaveURL(
      options.expectedUrl,
      { timeout: 15_000 },
    );
  }
  const tabs = await auditAllTabs(page);
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

  if (options.assertNoOverflow !== false) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `Horizontal overflow on ${concretePath}`).toBeLessThanOrEqual(4);
  }

  const interactiveSummary = await page.evaluate(() => {
    const root = document.querySelector("main") || document.body;
    const isShown = (el: Element) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    const buttons = Array.from(root.querySelectorAll("button")).filter(isShown).length;
    const links = Array.from(root.querySelectorAll("a[href]")).filter(isShown).length;
    const fields = Array.from(root.querySelectorAll("input, select, textarea")).filter(isShown).length;
    return { buttons, links, fields };
  });
  expect(
    interactiveSummary.buttons + interactiveSummary.links + interactiveSummary.fields,
    `No interactive or navigation elements rendered on ${concretePath}`,
  ).toBeGreaterThanOrEqual(0);

  await observer.assertClean(`${concretePath}:post-tabs`);
  recordVisitedRoute(
    routeTemplate,
    concretePath,
    res?.status() ?? 200,
    tabs.length,
    options.locale ?? "en",
  );
}

export async function assertPdfEndpoint(
  page: Page,
  urlPath: string,
) {
  const res = await page.request.get(urlPath);
  expect(res.status(), `PDF endpoint ${urlPath} status`).toBe(200);
  const ct = res.headers()["content-type"] || "";
  expect(ct, `PDF content-type for ${urlPath}`).toContain("application/pdf");
  const buf = await res.body();
  expect(buf.subarray(0, 5).toString("ascii"), `PDF magic bytes for ${urlPath}`).toBe("%PDF-");
  return buf.length;
}

export async function createTempStaffAccount(opts: {
  id: string;
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
}) {
  const env = loadRootEnv();
  const gatewayUrl = (env.API_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
  const token = mintServiceToken("admin");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const acctRes = await fetch(`${gatewayUrl}/v1/identity/staff/accounts/${opts.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      email: opts.email,
      username: opts.username,
      roles: [opts.role || "admin"],
      active: true,
    }),
  });
  expect([200, 204], `Sync staff account ${opts.id}`).toContain(acctRes.status);

  const pwRes = await fetch(`${gatewayUrl}/v1/identity/staff/accounts/${opts.id}/password`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password: opts.password }),
  });
  expect(pwRes.status, `Set password for ${opts.id}`).toBe(204);

  const userRes = await fetch(`${gatewayUrl}/v1/identity/admin/tables/user`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: opts.id,
      email: opts.email,
      full_name: opts.fullName,
      role: opts.role || "admin",
      is_active: true,
    }),
  });
  expect(userRes.status, `Create user row ${opts.id}`).toBe(200);

  return async function cleanup() {
    await fetch(`${gatewayUrl}/v1/identity/staff/accounts/${opts.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        email: opts.email,
        username: opts.username,
        roles: [opts.role || "admin"],
        active: false,
      }),
    });
    await fetch(`${gatewayUrl}/v1/identity/admin/tables/user/${opts.id}`, {
      method: "DELETE",
      headers,
    });
  };
}
