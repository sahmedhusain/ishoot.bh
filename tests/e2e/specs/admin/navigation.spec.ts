import { expect, test } from "@playwright/test";
import { login, watchErrors } from "../../helpers";
import { t } from "../../locale";

// Every page reachable from the sidebar renders for an administrator: no error page, no 404, no console errors.
test("every sidebar destination renders", async ({ page }) => {
  test.setTimeout(20 * 60_000);
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  const links = await page.locator('aside a[href^="/dashboard"]').evaluateAll((anchors) =>
    Array.from(new Set(anchors.map((a) => (a as HTMLAnchorElement).getAttribute("href")!.split("?")[0]))),
  );
  expect(links.length).toBeGreaterThan(10);
  const failures: string[] = [];
  for (const href of links) {
    const errors = watchErrors(page);
    const missing: string[] = [];
    page.on("response", (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));
    const response = await page.goto(href);
    await page.waitForLoadState("networkidle");
    const status = response?.status() ?? 0;
    const notFound = await page.getByRole("heading", { name: t.notFound.title }).count();
    const crashed = await page.getByText(/Application error|Unhandled Runtime Error|Internal Server Error/).count();
    if (status >= 400 || notFound || crashed || errors.errors.length) failures.push(`${href}: status ${status}${notFound ? ", not found" : ""}${crashed ? ", crashed" : ""}${missing.length ? `, failed requests: ${missing.join(", ")}` : errors.errors.length ? `, ${errors.errors.join("; ")}` : ""}`);
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.removeAllListeners("response");
  }
  expect(failures, failures.join("\n")).toEqual([]);
});
