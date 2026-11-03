// Test harness helper: constants and money helpers are pure, so harnesses load the real files instead of mocking them.
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const constantsDir = path.join(root, "../apps/admin/lib/database/constants") + path.sep;
const constantsDirs = [constantsDir, path.join(root, "apps/admin/constants") + path.sep];
const pureFiles = [path.join(root, "../apps/admin/lib/config/constants/currency.cjs"),path.join(root, "../apps/admin/locales/index"), path.join(root, "../apps/admin/lib/database/finance/money"), path.join(root, "../apps/admin/lib/database/hr/payroll-engine")];
let registered = false;

function realConstants(fromFile, id) {
  let target = null;
  if (id === "@platform/locales") target = path.join(root, "../apps/admin/locales/index");
  else if (id === "@platform/config/currency") target = path.join(root, "../apps/admin/lib/config/constants/currency.cjs");
  else if (id.startsWith("@platform/database/constants/")) target = path.join(constantsDir, id.slice("@platform/database/constants/".length));
  else if (id.startsWith(".")) target = path.resolve(root, path.dirname(fromFile), id);
  if (!target || !(constantsDirs.some((dir) => target.startsWith(dir)) || pureFiles.includes(target.replace(/\.ts$/, "")))) return null;
  if (!registered) {
    require("ts-node").register({ transpileOnly: true, skipProject: true, moduleTypes: { "../apps/admin/lib/config/**/*.ts": "cjs" }, compilerOptions: { module: "CommonJS", target: "ES2022", esModuleInterop: true } });
    registered = true;
  }
  return require(target);
}

module.exports = { realConstants };
