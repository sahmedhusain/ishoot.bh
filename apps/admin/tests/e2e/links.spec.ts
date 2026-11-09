import { expect, request as apiRequest, test } from "@playwright/test";
import users from "../../fixtures/users.json";
import { checkDownload, crawl } from "../../crawl";
import { t } from "../helpers/locale";
import { login } from "../../helpers";

const SKIP = /\/logout|\/sign\/|\/acknowledge\/|\/login/;
const GROUPS = ["legal", "hr", "finance", "clients", "assets", "company"];

async function archiveFiles(page: import("@playwright/test").Page) {
  const files = new Set<string>();
  for (const group of GROUPS) {
    await page.goto(`/dashboard/archive?group=${group}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const hrefs = await page
      .locator('main a[href^="/api/files/"]')
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")!));
    hrefs.forEach((href) => files.add(href));
  }
  return files;
}

test("every admin link, image and download works", async ({ page }) => {
  test.setTimeout(45 * 60_000);
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
    if (status === 200 && !file.startsWith("/api/files/brand/"))
      problems.push(`visitor could open ${file}`);
  }
  await anonymous.dispose();

  const context = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  const viewer = await context.newPage();
  await login(viewer, users.viewer.email, users.viewer.password);
  await expect(viewer).toHaveURL(/\/dashboard$/);
  const viewerFiles = await archiveFiles(viewer);
  for (const file of viewerFiles) {
    const failure = await checkDownload(viewer.request, file);
    if (failure) problems.push(`viewer: ${failure}`);
  }
  for (const file of adminFiles) {
    if (viewerFiles.has(file) || file.startsWith("/api/files/brand/")) continue;
    const status = (
      await viewer.request.get(file, { maxRedirects: 0 })
    ).status();
    if (status === 200)
      problems.push(
        `viewer could open ${file}, which their archive does not list`,
      );
  }
  await context.close();
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
