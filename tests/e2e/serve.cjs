// Run: node tests/e2e/serve.cjs <admin|web> <port> [database]
// Starts one app against a disposable database (default: E2E_DATABASE or platform_e2e_test) so local test
// runs never touch the development database. Values come from .env; only the database name is swapped.
// E2E_SERVER_MODE=start serves a production build made with `next build` (NEXT_DIST_DIR=.next-e2e) instead
// of the development server.
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
  // Several test servers share one Postgres; a small pool each keeps them under its connection limit.
  if (!parsed.searchParams.has("connection_limit")) parsed.searchParams.set("connection_limit", "5");
  return parsed.toString();
};

const root = path.resolve(__dirname, "../..");
const production = process.env.E2E_SERVER_MODE === "start";
const env = {
  ...process.env,
  DATABASE_URL: swap(process.env.DATABASE_URL),
  DIRECT_URL: swap(process.env.DIRECT_URL || process.env.DATABASE_URL),
  UPLOAD_ROOT: process.env.E2E_UPLOAD_ROOT || path.join(root, "tests/e2e/.uploads"),
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  PORT: port,
  // Own build folder, so cached data never mixes with a development server running from .next (one per port,
  // since two development servers of the same app cannot share a folder).
  NEXT_DIST_DIR: production ? ".next-e2e" : `.next-e2e-${port}`,
};

// Next rewrites tsconfig.json and next-env.d.ts to include the build folder; put them back.
const generated = ["tsconfig.json", "next-env.d.ts"].map((file) => path.join(root, "apps", app, file));
const originals = generated.map((file) => require("node:fs").readFileSync(file, "utf8"));
const restore = () => generated.forEach((file, i) => require("node:fs").writeFileSync(file, originals[i]));

const args = production ? ["start", "-p", port] : ["dev", "--turbopack", "-p", port];
const child = spawn(path.join(root, `apps/${app}/node_modules/.bin/next`), args, {
  cwd: path.join(root, "apps", app),
  env,
  stdio: "inherit",
});
// Next writes them while it boots; Playwright may kill the server without an exit event, so restore early too.
const early = setInterval(restore, 5000);
setTimeout(() => clearInterval(early), 120_000).unref();
child.on("exit", (code) => {
  restore();
  process.exit(code ?? 0);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
