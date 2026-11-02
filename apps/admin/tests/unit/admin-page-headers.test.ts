import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Every dashboard page opens with the shared PageHeader, sets its browser title from the same copy, and has a
// title and description in both admin dictionaries.
const admin = path.resolve(__dirname, "../../apps/admin");
const dashboard = path.join(admin, "app/dashboard");
const read = (file: string) => fs.readFileSync(file, "utf8");

// Pages that only send the visitor elsewhere.
const REDIRECT_ONLY = new Set(["crm/leads", "hr", "hr/gosi", "settings", "settings/security"]);
// The calendar's workbench has its own top app bar with the page title.
const OWN_HEADER = new Set(["calendar"]);

function pageFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(full);
    return entry.name === "page.tsx" ? [full] : [];
  });
}
const pages = pageFiles(dashboard).map((file) => ({
  file,
  key: path.relative(dashboard, path.dirname(file)).split(path.sep).join("/"),
}));

const registrySource = read(path.join(admin, "lib/page-registry.ts"));
const PAGE_KEYS = [...registrySource.match(/PAGE_KEYS = \[([\s\S]*?)\] as const/)![1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);

// The registry, compiled with stand-in icons, for its path matching.
const registry = { exports: {} as Record<string, any> };
vm.runInNewContext(
  ts.transpileModule(registrySource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  {
    module: registry,
    exports: registry.exports,
    require: (name: string) => (name === "lucide-react" ? new Proxy({}, { get: (_, key) => String(key) }) : {}),
  },
);
const { pageKeyForPath, pageSection } = registry.exports;

function resolveImport(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? path.join(admin, specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(from), specifier)
      : null;
  if (!base) return null;
  return [".tsx", ".ts", "/index.tsx"].map((ext) => base + ext).find((file) => fs.existsSync(file)) ?? null;
}

/** Whether a page renders PageHeader itself or through the components it imports (two levels deep). */
function reachesPageHeader(file: string, seen = new Set<string>(), depth = 0): boolean {
  if (seen.has(file) || depth > 2) return false;
  seen.add(file);
  const source = read(file);
  if (/<(PageHeader|DocumentDetailHeader)\b/.test(source)) return true;
  return [...source.matchAll(/from "([^"]+)"/g)].some(([, specifier]) => {
    const target = resolveImport(file, specifier);
    return !!target && target.startsWith(path.join(admin, "components")) && reachesPageHeader(target, seen, depth + 1);
  });
}

describe("admin page headers", () => {
  test("the registry lists exactly the dashboard pages", () => {
    expect([...PAGE_KEYS].sort()).toEqual(pages.map((page) => page.key).sort());
  });

  test.each(["en", "ar"])("every page has a title and description in %s", (locale) => {
    const copy = JSON.parse(read(path.resolve(__dirname, `../../packages/locales/src/admin/${locale}.json`))).pages;
    for (const key of PAGE_KEYS) {
      const entry = copy[key || "home"];
      expect(entry?.title, key).toBeTruthy();
      expect(entry?.description, key).toBeTruthy();
    }
  });

  test("every page sets its browser title from its own copy", () => {
    for (const { file, key } of pages) {
      if (REDIRECT_ONLY.has(key)) continue;
      expect(read(file), key).toContain(`export const generateMetadata = () => pageMetadata("${key}");`);
    }
  });

  test("every page opens with the shared header", () => {
    const missing = pages
      .filter(({ key }) => !REDIRECT_ONLY.has(key) && !OWN_HEADER.has(key))
      .filter(({ file }) => !reachesPageHeader(file))
      .map(({ key }) => key);
    expect(missing).toEqual([]);
  });

  test("hand-made headers are gone", () => {
    const leftovers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx$/.test(entry.name) && read(full).includes("data-page-header")) leftovers.push(path.relative(admin, full));
      }
    };
    walk(path.join(admin, "components"));
    walk(dashboard);
    // PageHeader renders the attribute; setup, sign-in and public signing pages run outside the dashboard.
    expect(leftovers.filter((file) => !/^components\/(layout\/PageHeader|setup\/|auth\/|signing\/)/.test(file))).toEqual([]);
  });

  test("routes resolve to their page pattern, literal segments first", () => {
    expect(pageKeyForPath("/dashboard")).toBe("");
    expect(pageKeyForPath("/dashboard/invoices/")).toBe("invoices");
    expect(pageKeyForPath("/dashboard/invoices/abc-123")).toBe("invoices/[id]");
    expect(pageKeyForPath("/dashboard/invoices/new")).toBe("invoices/new");
    expect(pageKeyForPath("/dashboard/orders/new?x=1")).toBe("orders/new");
    expect(pageKeyForPath("/dashboard/approvals/expense/42")).toBe("approvals/[type]/[id]");
    expect(pageKeyForPath("/dashboard/unknown/page/here")).toBeNull();
    expect(pageKeyForPath("/login")).toBeNull();
  });

  test("detail pages take the icon and group of their section", () => {
    expect(pageSection("procurement/bills/[id]")).toEqual(pageSection("procurement/bills"));
    expect(pageSection("crm/customers/[id]/edit").group).toBe("sales");
    expect(pageSection("hr/payroll/items/[id]").group).toBe("people");
  });
});
