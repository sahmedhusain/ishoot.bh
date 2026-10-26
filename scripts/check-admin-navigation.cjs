// Render the actual navigation for both locales and exercise permission/module boundaries.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const ts = require("typescript");
const { realConstants } = require("./lib/real-constants.cjs");
const appRequire = createRequire(require.resolve("../apps/admin/package.json"));
const React = appRequire("react");
const { renderToStaticMarkup } = appRequire("react-dom/server");
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(id) {
      if (id === "react" || id === "react/jsx-runtime") return appRequire(id);
      if (id in mocks) return mocks[id];
      const real = realConstants(file, id);
      if (real) return real;
      throw new Error("Unmocked dependency: " + id);
    },
    console,
    Date,
    Intl,
    Set,
  });
  return module.exports;
}
const nav = load("apps/admin/lib/sidebar-navigation.ts");
const { ROUTES } = realConstants(
  "apps/admin/x.ts",
  "@platform/database/constants/routes",
);
for (const [role, group] of Object.entries({
  accountant: "finance",
  sales: "sales",
  project_lead: "operations",
  hr_manager: "people",
  procurement_officer: "operations",
  marketing: "content",
  admin: "people",
})) {
  assert.equal(nav.sidebarGroupOrder(role)[1], group);
  assert.equal(
    new Set(nav.sidebarGroupOrder(role)).size,
    nav.sidebarGroupOrder(role).length,
  );
}
assert.equal(
  nav.activeNavigationHref(
    ["/dashboard", "/dashboard/hr", "/dashboard/hr/payroll"],
    "/dashboard/hr/payroll/123",
  ),
  "/dashboard/hr/payroll",
);
assert.equal(
  nav.activeNavigationHref(["/dashboard", "/dashboard/hr"], "/dashboard/hrms"),
  undefined,
);
for (const locale of ["en", "ar"]) {
  const t = require("../packages/locales/src/admin/" + locale + ".json");
  function render(role, can, disabled = [], pathname = ROUTES.hr.payroll()) {
    const { Sidebar } = load("apps/admin/components/layout/Sidebar.tsx", {
      "next/link": ({ children, ...props }) =>
        React.createElement("a", props, children),
      "next/navigation": { usePathname: () => pathname },
      "@platform/ui": {
        useDialog: () => ({}),
        Button: ({ children, ...props }) => React.createElement("button", props, children),
      },
      "lucide-react": new Proxy(
        {},
        { get: () => () => React.createElement("svg") },
      ),
      "../../hooks/usePermissions": {
        usePermissions: () => ({
          role,
          user: { id: "test" },
          can,
          loading: false,
          managesTeam: false,
        }),
      },
      "./SidebarContext": {
        useSidebar: () => ({ isMobileOpen: false, setIsMobileOpen() {} }),
      },
      "../../hooks/useAdminLocale": { useAdminLocale: () => ({ t, locale }) },
      "../../hooks/useFeatureToggles": {
        useFeatureToggles: () => ({
          isFeatureEnabled: (key) => !disabled.includes(key),
        }),
      },
      "../../lib/sidebar-navigation": nav,
    });
    return renderToStaticMarkup(React.createElement(Sidebar));
  }
  const all = render("super_admin", () => true);
  assert.equal(
    (all.match(/aria-current="page"/g) || []).length,
    1,
    "Only the deepest matching destination is active",
  );
  const links = [...all.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(
    new Set(links).size,
    links.length,
    "Destinations must not repeat across categories",
  );
  assert.ok(
    !links.includes("/dashboard/profile"),
    "Profile belongs in the account menu",
  );
  const limited = render("sales", (resource) =>
    ["deals", "contacts", "self_service", "calendar"].includes(resource),
  );
  assert.ok(limited.includes('href="' + ROUTES.crm.deals + '"'));
  assert.ok(!limited.includes('href="' + ROUTES.hr.payroll() + '"'));
  assert.ok(!limited.includes('href="' + ROUTES.settings.company + '"'));
  assert.ok(
    !limited.includes('href="' + ROUTES.team + '"'),
    "Team view requires a reporting relationship",
  );
  const modules = render("super_admin", () => true, ["payroll", "calendar"]);
  assert.ok(!modules.includes('href="' + ROUTES.hr.payroll() + '"'));
  assert.ok(!modules.includes('href="' + ROUTES.calendar + '"'));
  const finance = render("accountant", () => true);
  assert.ok(
    finance.indexOf(t.nav.finance.replaceAll("&", "&amp;")) <
      finance.indexOf(t.navigationGroups.sales.replaceAll("&", "&amp;")),
  );
  const customized = render("sales", (resource) => resource === "payroll");
  assert.ok(
    customized.includes('href="' + ROUTES.hr.payroll() + '"'),
    "Custom permissions decide visibility independently of role priority",
  );
}
console.log(
  "Navigation checks passed: both languages, role order, custom permission gates, module gates, unique destinations and active-page matching.",
);
