// Run: node tests/e2e/serve.cjs <admin|web> <port> [database]
// Starts one app against a disposable database (default: E2E_DATABASE or platform_e2e_test) so local test
// runs never touch the development database. Values come from .env; only the database name is swapped.
const { spawn } = require("node:child_process");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const [app, port, database = process.env.E2E_DATABASE || "platform_e2e_test"] = process.argv.slice(2);
if (!["admin", "web"].includes(app) || !/^\d+$/.test(port ?? "")) {
  console.error("Usage: node tests/e2e/serve.cjs <admin|web> <port> [database]");
  process.exit(1);
}
if (!/_test$/.test(database)) {
  console.error("End-to-end servers only run against a database whose name ends in _test.");
  process.exit(1);
}

const swap = (url) => {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
};

const root = path.resolve(__dirname, "../..");
const env = {
  ...process.env,
  DATABASE_URL: swap(process.env.DATABASE_URL),
  DIRECT_URL: swap(process.env.DIRECT_URL || process.env.DATABASE_URL),
  UPLOAD_ROOT: process.env.E2E_UPLOAD_ROOT || path.join(root, "tests/e2e/.uploads"),
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  PORT: port,
  // Own build folder, so cached data never mixes with a development server running from .next.
  NEXT_DIST_DIR: ".next-e2e",
};

const child = spawn(path.join(root, `apps/${app}/node_modules/.bin/next`), ["dev", "--turbopack", "-p", port], {
  cwd: path.join(root, "apps", app),
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
