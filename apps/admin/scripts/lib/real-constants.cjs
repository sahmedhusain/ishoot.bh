// Test harness helper: constants and money helpers are pure, so harnesses load the real files instead of mocking them.
const path = require("node:path");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

const adminRoot = path.resolve(__dirname, "../..");
const constantsDir = path.join(adminRoot, "lib/database/constants") + path.sep;
const constantsDirs = [constantsDir, path.join(adminRoot, "constants") + path.sep];
const pureFiles = [
  path.join(adminRoot, "lib/config/constants/currency.cjs"),
  path.join(adminRoot, "locales/index"),
  path.join(adminRoot, "lib/database/finance/money"),
  path.join(adminRoot, "lib/database/hr/payroll-engine"),
];
let registered = false;

function setupHooks() {
  if (registered) return;
  registered = true;

  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request.startsWith("@platform/database/")) {
      const rel = request.slice("@platform/database/".length);
      const candidate = path.join(adminRoot, "lib/database", rel);
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    }
    if (request === "@platform/database") {
      const candidate = path.join(adminRoot, "lib/database/index");
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    }
    if (request.startsWith("@platform/locales")) {
      const candidate = path.join(adminRoot, "locales/index");
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    }
    if (request === "@platform/config/currency") {
      const candidate = path.join(adminRoot, "lib/config/constants/currency.cjs");
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    }
    if (request === "@platform/config/phone") {
      const candidate = path.join(adminRoot, "lib/config/phone");
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    }
    if (request === "@platform/config") {
      const candidate = path.join(adminRoot, "lib/config/index");
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    }
    if (request.startsWith("@platform/config/")) {
      const rel = request.slice("@platform/config/".length);
      const candidate = path.join(adminRoot, "lib/config", rel);
      return originalResolveFilename.call(this, candidate, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  require.extensions[".ts"] = function (module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    module._compile(output, filename);
  };
}

function realConstants(fromFile, id) {
  setupHooks();
  let target = null;
  if (id === "@platform/locales") target = path.join(adminRoot, "locales/index");
  else if (id === "@platform/config/currency") target = path.join(adminRoot, "lib/config/constants/currency.cjs");
  else if (id === "@platform/config/phone") target = path.join(adminRoot, "lib/config/phone");
  else if (id.startsWith("@platform/database/constants/")) target = path.join(constantsDir, id.slice("@platform/database/constants/".length));
  else if (id.startsWith(".")) target = path.resolve(adminRoot, path.dirname(fromFile), id);
  if (!target || !(constantsDirs.some((dir) => target.startsWith(dir)) || pureFiles.includes(target.replace(/\.ts$/, "")))) return null;
  return require(target);
}

module.exports = { realConstants, setupHooks };
