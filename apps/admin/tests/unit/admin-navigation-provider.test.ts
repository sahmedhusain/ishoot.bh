import { expect, test } from "vitest";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const appRequire = createRequire(
  new URL("../../package.json", import.meta.url),
);
const React = appRequire("react");
const { renderToStaticMarkup } = appRequire("react-dom/server");
const AppRouterContext = React.createContext(null);
const compiledModule = { exports: {} as Record<string, any> };
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../../hooks/useUnsavedChanges.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;
vm.runInNewContext(code, {
  module: compiledModule,
  exports: compiledModule.exports,
  require(id: string) {
    if (id === "react" || id === "react/jsx-runtime") return appRequire(id);
    if (id === "next/dist/shared/lib/app-router-context.shared-runtime")
      return { AppRouterContext };
    if (id === "@platform/ui") return { ConfirmDialog: () => null };
    if (id === "./useAdminLocale")
      return { useAdminLocale: () => ({ t: { unsavedChanges: {} } }) };
    throw Error(`Unexpected dependency: ${id}`);
  },
});

test("the fallback document renders without a router context", () => {
  const content = React.createElement("main", null, "Missing page");
  expect(
    renderToStaticMarkup(
      React.createElement(
        compiledModule.exports.UnsavedChangesProvider,
        null,
        content,
      ),
    ),
  ).toBe("<main>Missing page</main>");
});

test("editable app routes still receive their navigation guard", () => {
  function Consumer() {
    const guard = compiledModule.exports.useNavigationGuard();
    expect(typeof guard.register).toBe("function");
    expect(typeof guard.requestNavigation).toBe("function");
    expect(typeof guard.navigateConfirmed).toBe("function");
    return React.createElement("main", null, "Editable app");
  }
  const router = { push() {}, replace() {} };
  const content = React.createElement(
    AppRouterContext.Provider,
    { value: router },
    React.createElement(
      compiledModule.exports.UnsavedChangesProvider,
      null,
      React.createElement(Consumer),
    ),
  );
  expect(renderToStaticMarkup(content)).toBe("<main>Editable app</main>");
});
