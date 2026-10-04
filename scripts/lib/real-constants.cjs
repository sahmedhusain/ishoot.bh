// Test harness helper: constants and money helpers are pure, so harnesses load the real files instead of mocking them.
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const constantsDir = path.join(root, "packages/database/src/constants") + path.sep;
const constantsDirs = [constantsDir, path.join(root, "apps/admin/constants") + path.sep];
const pureFiles = [path.join(root, "packages/database/src/finance/money")];
let registered = false;

function realConstants(fromFile, id) {
  let target = null;
  if (id.startsWith("@ishoot/database/constants/")) target = path.join(constantsDir, id.slice("@ishoot/database/constants/".length));
  else if (id.startsWith(".")) target = path.resolve(root, path.dirname(fromFile), id);
  if (!target || !(constantsDirs.some((dir) => target.startsWith(dir)) || pureFiles.includes(target.replace(/\.ts$/, "")))) return null;
  if (!registered) {
    require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", esModuleInterop: true } });
    registered = true;
  }
  return require(target);
}

module.exports = { realConstants };
