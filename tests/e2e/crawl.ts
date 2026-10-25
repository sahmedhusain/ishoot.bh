import type { APIRequestContext, Page } from "@playwright/test";
import { brokenImages } from "./helpers";

/** What one visited page links to and what is wrong with it. */
export interface PageReport {
  url: string;
  problems: string[];
  /** Same-origin page links, without the hash. */
  links: string[];
  /** Links that should answer with a file: uploads, PDFs, exports and anything marked download. */
  files: string[];
}

const LOCALES = ["en", "ar"];
const FILE_LINK = /^\/api\/(files\/|exports\/|.*\/pdf$|letterhead)/;

/**
 * Visits `path` and reports: error status, crash or not-found page, broken images, new-tab links without
 * rel="noreferrer", and on the website, links that hard-code a language other than the page's own.
 */
export async function inspectPage(page: Page, path: string, options: { website?: boolean; notFoundTitle: string }): Promise<PageReport> {
  const problems: string[] = [];
  const failed: string[] = [];
  const onResponse = (response: { status: () => number; url: () => string; request: () => { resourceType: () => string } }) => {
    // Pages, scripts, styles and images the page asked for; prefetches of other pages are not this page's problem.
    if (response.status() >= 400 && ["document", "script", "stylesheet", "image", "font"].includes(response.request().resourceType())) failed.push(`${response.status()} ${response.url()}`);
  };
  page.on("response", onResponse);
  // A development server may abort a navigation while it recompiles; one retry tells that apart from a real failure.
  const response = await page.goto(path).catch(() => page.goto(path));
  await page.waitForLoadState("networkidle").catch(() => undefined);
  page.off("response", onResponse);
  const status = response?.status() ?? 0;
  if (status >= 400) problems.push(`status ${status}`);
  if (await page.getByRole("heading", { name: options.notFoundTitle }).count()) problems.push("not-found page");
  if (await page.getByText(/Application error|Unhandled Runtime Error|Internal Server Error/).count()) problems.push("crashed");
  for (const src of await brokenImages(page)) problems.push(`broken image ${src}`);
  problems.push(...failed.map((f) => `failed request ${f}`));

  const origin = new URL(page.url()).origin;
  const locale = options.website ? new URL(page.url()).pathname.split("/")[1] : "";
  const anchors = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"), (a) => ({
      href: (a as HTMLAnchorElement).href,
      raw: a.getAttribute("href") ?? "",
      target: a.getAttribute("target") ?? "",
      rel: a.getAttribute("rel") ?? "",
      hreflang: a.getAttribute("hreflang") ?? "",
      download: a.hasAttribute("download"),
    })),
  );
  const links = new Set<string>();
  const files = new Set<string>();
  for (const anchor of anchors) {
    if (anchor.target === "_blank" && !/\bnoreferrer\b/.test(anchor.rel)) problems.push(`new-tab link without rel="noreferrer": ${anchor.raw}`);
    let url: URL;
    try {
      url = new URL(anchor.href);
    } catch {
      problems.push(`invalid link ${anchor.raw}`);
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.origin !== origin) continue;
    const target = url.pathname + url.search;
    if (FILE_LINK.test(url.pathname) || anchor.download) {
      files.add(target);
      continue;
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) continue;
    if (options.website) {
      const first = url.pathname.split("/")[1];
      if (!LOCALES.includes(first)) problems.push(`link without a language: ${anchor.raw}`);
      else if (first !== locale && anchor.hreflang !== first) problems.push(`link hard-codes another language: ${anchor.raw}`);
    }
    links.add(target);
  }
  return { url: path, problems, links: [...links], files: [...files] };
}

/** Collapses ids in a path so the crawler visits only a couple of pages of each kind. */
export const routePattern = (path: string) =>
  path
    .split("?")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/c[a-z0-9]{20,}/g, "/:id")
    .replace(/\/[a-z0-9-]*\d[a-z0-9-]*$/i, "/:id");

/** Breadth-first visit from `start`, at most `perPattern` pages of each route pattern and `limit` pages in all. */
export async function crawl(page: Page, start: string[], options: { website?: boolean; notFoundTitle: string; limit: number; perPattern: number; skip?: RegExp }) {
  const queue = [...start];
  const seen = new Set<string>(queue);
  const perPattern = new Map<string, number>();
  const reports: PageReport[] = [];
  while (queue.length && reports.length < options.limit) {
    const path = queue.shift()!;
    const pattern = routePattern(path);
    const count = perPattern.get(pattern) ?? 0;
    if (count >= options.perPattern) continue;
    perPattern.set(pattern, count + 1);
    const report = await inspectPage(page, path, options);
    reports.push(report);
    for (const link of report.links) {
      if (seen.has(link) || options.skip?.test(link)) continue;
      seen.add(link);
      queue.push(link);
    }
  }
  return reports;
}

/** A link that should download a file answers 200 with a non-HTML body. */
export async function checkDownload(request: APIRequestContext, path: string): Promise<string | null> {
  const response = await request.get(path, { maxRedirects: 3 });
  if (response.status() !== 200) return `${path}: status ${response.status()}`;
  const type = response.headers()["content-type"] ?? "";
  if (type.includes("text/html")) return `${path}: answered with a page instead of a file`;
  if ((await response.body()).length === 0) return `${path}: empty file`;
  return null;
}
