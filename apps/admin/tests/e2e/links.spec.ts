import { expect, request as apiRequest, test } from "@playwright/test";
import { checkDownload, crawl } from "./helpers/crawl";
import { t } from "./helpers/locale";
import { login } from "./helpers/helpers";
import { loginAsAdmin } from "./helpers/admin-audit";
import { mintServiceToken } from "./helpers/strict-audit";

const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";
const SKIP = /\/logout|\/sign\/|\/acknowledge\/|\/login/;
const GROUPS = ["legal", "hr", "finance", "clients", "assets", "company"];

async function archiveFiles(page: import("@playwright/test").Page) {
  const files = new Set<string>();
  for (const group of GROUPS) {
    await page.goto(`/dashboard/archive?group=${group}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const hrefs = await page
      .locator('main a[href^="/api/files/"]')
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")!));
    hrefs.forEach((href) => files.add(href));
  }
  return files;
}

test("every admin link, image and download works", async ({ page }) => {
  test.setTimeout(45 * 60_000);
  await loginAsAdmin(page);
  await page.goto("/dashboard");
  const sidebar = await page
    .locator('aside a[href^="/dashboard"]')
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")!));
  const reports = await crawl(page, ["/dashboard", ...new Set(sidebar)], {
    notFoundTitle: t.notFound.title,
    limit: 260,
    perPattern: 2,
    skip: SKIP,
  });
  expect(reports.length).toBeGreaterThan(40);
  const problems = reports.flatMap((report) =>
    report.problems.map((problem) => `${report.url}: ${problem}`),
  );

  const files = [...new Set(reports.flatMap((report) => report.files))]
    .filter((file) => !/\/api\/exports\//.test(file))
    .slice(0, 120);
  for (const file of files) {
    const failure = await checkDownload(page.request, file);
    if (failure) problems.push(failure);
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("attachments open for people allowed to see them and are refused to everyone else", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(10 * 60_000);
  await loginAsAdmin(page);
  const adminFiles = await archiveFiles(page);
  expect(adminFiles.size).toBeGreaterThan(5);
  const problems: string[] = [];
  for (const file of adminFiles) {
    const failure = await checkDownload(page.request, file);
    if (failure) problems.push(`administrator: ${failure}`);
  }

  const anonymous = await apiRequest.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  for (const file of adminFiles) {
    const status = (await anonymous.get(file, { maxRedirects: 0 })).status();
    if (status === 200 && !file.startsWith("/api/files/brand/") && !file.startsWith("/api/files/media/"))
      problems.push(`visitor could open ${file}`);
  }
  await anonymous.dispose();

  const serviceToken = mintServiceToken("admin");
  const suffix = Date.now().toString();
  const viewerId = `e2e-viewer-${suffix}`;
  const viewerUsername = `VW${suffix.slice(-8)}`;
  const viewerEmail = `e2e-viewer-${suffix}@example.test`;
  const viewerPassword = `ViewerPass!${suffix}`;

  const gw = await apiRequest.newContext({
    baseURL: GATEWAY,
    extraHTTPHeaders: { Authorization: `Bearer ${serviceToken}` },
  });
  const syncRes = await gw.put(`/v1/identity/staff/accounts/${viewerId}`, {
    data: {
      email: viewerEmail,
      username: viewerUsername,
      roles: ["viewer"],
      active: true,
    },
  });
  expect([200, 204], `Sync viewer account: ${syncRes.status()} ${await syncRes.text()}`).toContain(syncRes.status());
  const pwRes = await gw.put(`/v1/identity/staff/accounts/${viewerId}/password`, {
    data: { password: viewerPassword },
  });
  expect(pwRes.status(), `Set viewer password: ${await pwRes.text()}`).toBe(204);
  const userRes = await gw.post(`/v1/identity/admin/tables/user`, {
    data: {
      id: viewerId,
      email: viewerEmail,
      full_name: `E2E Viewer ${suffix}`,
      role: "viewer",
      is_active: true,
    },
  });
  expect(userRes.status(), `Create viewer user row: ${await userRes.text()}`).toBe(200);

  const context = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  try {
    const viewer = await context.newPage();
    await login(viewer, viewerUsername, viewerPassword);
    await expect(viewer).toHaveURL(/\/dashboard$/);
    const viewerFiles = await archiveFiles(viewer);
    for (const file of viewerFiles) {
      const failure = await checkDownload(viewer.request, file);
      if (failure) problems.push(`viewer: ${failure}`);
    }
    for (const file of adminFiles) {
      if (viewerFiles.has(file) || file.startsWith("/api/files/brand/") || file.startsWith("/api/files/media/")) continue;
      const status = (
        await viewer.request.get(file, { maxRedirects: 0 })
      ).status();
      if (status === 200)
        problems.push(
          `viewer could open ${file}, which their archive does not list`,
        );
    }
  } finally {
    await context.close();
    await gw.put(`/v1/identity/staff/accounts/${viewerId}`, {
      data: { email: viewerEmail, username: viewerUsername, roles: ["viewer"], active: false },
    });
    await gw.delete(`/v1/identity/admin/tables/user/${viewerId}`);
    await gw.dispose();
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("files attached to records are in the company archive", async ({
  page,
}) => {
  test.setTimeout(15 * 60_000);
  const archived = await archiveFiles(page);
  const lists = [
    "/dashboard/crm/contacts",
    "/dashboard/crm/deals",
    "/dashboard/invoices",
    "/dashboard/payments",
    "/dashboard/expenses",
    "/dashboard/hr/employees",
  ];
  const reports = await crawl(page, lists, {
    notFoundTitle: t.notFound.title,
    limit: 40,
    perPattern: 4,
    skip: /\/(new|edit)$|\?/,
  });
  const missing = [...new Set(reports.flatMap((report) => report.files))]
    .filter((file) =>
      /^\/api\/files\/(vault|deals|invoices|payments|certificates|general)\//.test(
        file,
      ),
    )
    .filter((file) => !archived.has(file));
  expect(
    missing,
    `Attached files missing from the archive:\n${missing.join("\n")}`,
  ).toEqual([]);
});
