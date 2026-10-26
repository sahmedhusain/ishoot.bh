import { expect, test } from "@playwright/test";
import en from "../../../../packages/locales/src/en.json";
import { checkDownload, crawl } from "../../crawl";

// Every page of the website in both languages: no broken links, images or downloads, new tabs open with
// rel="noreferrer", and links stay in the page's language (only the language switcher, marked hreflang, leaves it).
for (const locale of ["en", "ar"] as const) {
  test(`every /${locale} link, image and download works`, async ({ page }) => {
    test.setTimeout(20 * 60_000);
    const reports = await crawl(page, [`/${locale}`], {
      website: true,
      notFoundTitle: en.common.notFoundTitle,
      limit: 120,
      perPattern: 3,
    });
    expect(reports.length).toBeGreaterThan(3);
    const problems = reports.flatMap((report) =>
      report.problems.map((problem) => `${report.url}: ${problem}`),
    );
    for (const file of [
      ...new Set(reports.flatMap((report) => report.files)),
    ]) {
      const failure = await checkDownload(page.request, file);
      if (failure) problems.push(failure);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("every address in the sitemap answers", async ({ page, baseURL }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  );
  expect(urls.length).toBeGreaterThan(3);
  const failures: string[] = [];
  for (const path of urls) {
    const status = (
      await page.request.get(new URL(path, baseURL).href)
    ).status();
    if (status !== 200) failures.push(`${path}: ${status}`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});
