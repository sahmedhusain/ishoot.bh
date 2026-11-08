import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { testDatabase } from "./helpers/helpers";
import { prepareLayoutFixtures } from "./helpers/route-layout-fixtures";
import { modules, setModule } from "./helpers/modules";

const db = testDatabase();
let disabledModules: string[] = [];
let fixtures: Awaited<ReturnType<typeof prepareLayoutFixtures>> | undefined;
test.beforeAll(async () => {
  expect(process.env.E2E_SEEDED_DATABASE || "platform_e2e_test").toMatch(
    /_test$/,
  );
  disabledModules = (
    await modules().then((all) => all.filter((m) => !m.isEnabled))
  ).map((row) => row.moduleKey);
  await modules().then((all) =>
    Promise.all(all.map((m) => setModule(m.moduleKey, true))),
  );
  fixtures = await prepareLayoutFixtures(db);
});
test.afterAll(async () => {
  await fixtures?.cleanup();
  await Promise.all(disabledModules.map((key) => setModule(key, false)));
  await db.$disconnect();
});

const routeRoot = path.resolve(
  __dirname,
  "../../app/dashboard",
);
function routes(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? routes(file)
      : entry.name === "page.tsx"
        ? [
            "/dashboard" +
              file.slice(routeRoot.length).replace(/\/page\.tsx$/, ""),
          ]
        : [];
  });
}
const inventory = routes(routeRoot).sort();
const dynamic = inventory.filter((route) => route.includes("["));
const pattern = (route: string) =>
  new RegExp("^" + route.replace(/\[[^\]]+\]/g, "[^/]+") + "$", "u");

for (const locale of ["en", "ar"] as const) {
  test(`every available route and tab fits desktop, tablet and phone (${locale})`, async ({
    page,
  }, info) => {
    test.setTimeout(30 * 60_000);
    const queue = [
      ...inventory.filter((route) => !route.includes("[")),
      ...(fixtures?.routes ?? []),
    ];
    const covered = new Set([
        ...queue,
        ...dynamic.filter((target) =>
          fixtures?.routes.some((href) => pattern(target).test(href)),
        ),
      ]),
      failures: string[] = [],
      results: object[] = [];
    await page.addInitScript((locale) => {
      localStorage.setItem("platform_admin_locale", locale);
      localStorage.setItem(
        "platform_admin_theme",
        locale === "ar" ? "dark" : "light",
      );
    }, locale);
    for (const route of queue) {
      try {
        await test.step(route, async () => {
          await page.setViewportSize({ width: 1440, height: 900 });
          const response = await page.goto(route);
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          const resolved = new URL(page.url()).pathname;
          if ((response?.status() ?? 500) >= 400)
            failures.push(`${route}: HTTP ${response?.status()}`);
          if (!resolved.startsWith("/dashboard")) {
            failures.push(`${route}: redirected to ${resolved}`);
            return;
          }
          await expect(page.locator(".admin-page")).toBeVisible();
          const links = await page
            .locator('main a[href^="/dashboard/"]')
            .evaluateAll((nodes) =>
              nodes.map((node) => (node as HTMLAnchorElement).pathname),
            );
          for (const target of dynamic) {
            if (covered.has(target)) continue;
            const example = links.find(
              (href) => !inventory.includes(href) && pattern(target).test(href),
            );
            if (example) {
              covered.add(target);
              queue.push(example);
            }
          }
          const states: object[] = [];
          const measure = async (state: string) => {
            const widths = [];
            for (const width of [1440, 768, 390]) {
              await page.setViewportSize({ width, height: 900 });
              await page.evaluate(
                () =>
                  new Promise<void>((resolve) =>
                    requestAnimationFrame(() =>
                      requestAnimationFrame(() => resolve()),
                    ),
                  ),
              );
              const layout = await page.evaluate(() => {
                const main =
                  document.querySelector<HTMLElement>(".admin-main")!;
                const clipped: string[] = [];
                for (const control of document.querySelectorAll<HTMLElement>(
                  ".admin-page input, .admin-page button, .admin-page textarea, .admin-page [data-page-header], .admin-page [data-page-toolbar]",
                )) {
                  const box = control.getBoundingClientRect(),
                    style = getComputedStyle(control);
                  if (
                    box.width < 4 ||
                    box.height < 4 ||
                    style.opacity === "0" ||
                    control.closest("[hidden], [data-print-target]")
                  )
                    continue;
                  if (box.left >= -2 && box.right <= innerWidth + 2) continue;
                  let parent = control.parentElement,
                    scrollable = false;
                  while (parent && parent !== main) {
                    if (
                      /auto|scroll/.test(getComputedStyle(parent).overflowX) &&
                      parent.scrollWidth > parent.clientWidth + 1
                    )
                      scrollable = true;
                    parent = parent.parentElement;
                  }
                  if (!scrollable)
                    clipped.push(
                      `${control.tagName} ${control.getAttribute("aria-label") || control.textContent?.trim().slice(0, 65) || control.getAttribute("name") || control.className}: ${Math.round(box.left)}…${Math.round(box.right)}`,
                    );
                }
                return {
                  overflow: Math.max(
                    document.documentElement.scrollWidth - innerWidth,
                    main.scrollWidth - main.clientWidth,
                  ),
                  clipped,
                  nativeSelects: [
                    ...document.querySelectorAll("select"),
                  ].filter((node) => node.getClientRects().length).length,
                };
              });
              if (
                layout.overflow > 2 ||
                layout.clipped.length ||
                layout.nativeSelects
              )
                failures.push(
                  `${route} / ${state} (${width}): ${JSON.stringify(layout)}`,
                );
              widths.push({ width, ...layout });
            }

            states.push({ state, widths });
          };
          await measure("initial");
          let tabs = 0;
          const groups = page.locator('main [role="tablist"]');
          for (let group = 0; group < (await groups.count()); group++) {
            const buttons = groups
              .nth(group)
              .getByRole("tab")
              .filter({ visible: true });
            for (let index = 0; index < (await buttons.count()); index++) {
              const button = buttons.nth(index);
              // Route links are covered by the route queue; this pass switches local panels only.
              if (
                (await button.getAttribute("href")) ||
                (await button.isDisabled())
              )
                continue;
              await button.click();
              await expect(button).toHaveAttribute("aria-selected", "true");
              tabs++;
              await measure(
                (await button.textContent())?.trim() || `tab-${tabs}`,
              );
            }
          }
          results.push({ route, resolved, tabs, states });
        });
      } catch (error) {
        failures.push(
          `${route}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    const missing = dynamic.filter((route) => !covered.has(route));
    const reportPath = info.outputPath(`admin-route-layout-${locale}.json`);
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          locale,
          patterns: inventory.length,
          visited: results.length,
          missingFixtures: missing,
          results,
          failures,
        },
        null,
        2,
      ),
    );
    await info.attach(`admin-route-layout-${locale}.json`, {
      path: reportPath,
      contentType: "application/json",
    });
    expect(
      missing,
      "Every dynamic route needs a representative fixture",
    ).toEqual([]);
    expect(results.length).toBe(inventory.length);
    expect(failures, failures.join("\n")).toEqual([]);
  });
}
