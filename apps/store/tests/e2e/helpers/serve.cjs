const { spawn } = require("node:child_process");
const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

const [app, port, database = process.env.E2E_DATABASE || "platform_e2e_test"] =
  process.argv.slice(2);
if (!["admin", "web", "it"].includes(app) || !/^\d+$/.test(port ?? "")) {
  console.error(
    "Usage: node tests/e2e/serve.cjs <admin|web|it> <port> [database]",
  );
  process.exit(1);
}
if (app !== "it" && !/_test$/.test(database)) {
  console.error(
    "End-to-end servers only run against a database whose name ends in _test.",
  );
  process.exit(1);
}

const swap = (url) => {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  if (!parsed.searchParams.has("connection_limit"))
    parsed.searchParams.set("connection_limit", "5");
  return parsed.toString();
};

const root = path.resolve(__dirname, "../..");
const build = app === "it" && process.env.E2E_SERVER_MODE !== "start";
const production = build || process.env.E2E_SERVER_MODE === "start";
const env = {
  ...process.env,
  DATABASE_URL: swap(process.env.DATABASE_URL),
  DIRECT_URL: swap(process.env.DIRECT_URL || process.env.DATABASE_URL),
  PORT: port,
  WEB_URL: process.env.E2E_WEB_URL || "http://localhost:3013",
  NEXT_PUBLIC_WEB_URL: process.env.E2E_WEB_URL || "http://localhost:3013",
  ADMIN_URL: process.env.E2E_ADMIN_URL || "http://localhost:3012",
  NEXT_PUBLIC_ADMIN_URL: process.env.E2E_ADMIN_URL || "http://localhost:3012",
  NEXT_DIST_DIR: production ? ".next-e2e" : `.next-e2e-${port}`,
  ...(production ? { NODE_ENV: "production" } : {}),
};

const generated = ["tsconfig.json", "next-env.d.ts"].map((file) =>
  path.join(root, "apps", app, file),
);
const originals = generated.map((file) =>
  require("node:fs").readFileSync(file, "utf8"),
);
const restore = () =>
  generated.forEach((file, i) =>
    require("node:fs").writeFileSync(file, originals[i]),
  );

const args = production
  ? ["start", "-p", port]
  : ["dev", "--turbopack", "-p", port];
const launch = (args) =>
  spawn(path.join(root, `apps/${app}/node_modules/.bin/next`), args, {
    cwd: path.join(root, "apps", app),
    env,
    stdio: "inherit",
  });
let child = launch(build ? ["build", "--webpack"] : args);
const early = setInterval(restore, 5000);
early.unref();
const exited = (code, signal) => {
  clearInterval(early);
  restore();
  process.exit(code ?? (signal ? 1 : 0));
};
child.on("exit", (code, signal) => {
  restore();
  if (!build || code !== 0 || signal) return exited(code, signal);
  child = launch(args);
  child.on("exit", exited);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
