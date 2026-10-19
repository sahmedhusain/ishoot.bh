// Run: node tests/e2e/prepare-db.cjs <seeded|blank|bare> <database_test>
// Recreates a disposable database (name must end in _test) on the server in DATABASE_URL and fills it:
//   seeded  migrations + demo company seed (no volume data) + the e2e accounts
//   blank   migrations + bootstrap without a company profile (first-run setup wizard) + the e2e accounts
//   bare    migrations only
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "../..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });

const [mode, database] = process.argv.slice(2);
if (!["seeded", "blank", "bare"].includes(mode) || !/^[a-z0-9_]+_test$/.test(database ?? "")) {
  console.error("Usage: node tests/e2e/prepare-db.cjs <seeded|blank|bare> <name_ending_in_test>");
  process.exit(1);
}

const serverUrl = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
const urlFor = (name) => {
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  return url.toString();
};
const target = urlFor(database);
const users = require("./fixtures/users.json");
const env = {
  ...process.env,
  DATABASE_URL: target,
  DIRECT_URL: target,
  UPLOAD_ROOT: process.env.E2E_UPLOAD_ROOT || path.join(root, "tests/e2e/.uploads"),
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  NODE_ENV: "test",
};
const run = (command, args, extra = {}) => execFileSync(command, args, { cwd: root, env: { ...env, ...extra }, stdio: "inherit" });

async function main() {
  // CREATE DATABASE cannot run inside a transaction, so it goes through a plain client on the maintenance database.
  const { PrismaClient } = createRequire(path.join(root, "packages/database/package.json"))("@prisma/client");
  const admin = new PrismaClient({ datasources: { db: { url: urlFor(serverUrl.pathname.slice(1) || "postgres") } } });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.$disconnect();
  }
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "deploy", "--schema", "packages/database/prisma/schema.prisma"]);
  if (mode === "bare") return;
  const login = { SUPER_ADMIN_EMAIL: users.admin.email, SUPER_ADMIN_PASSWORD: users.admin.password, SUPER_ADMIN_NAME: users.admin.fullName };
  if (mode === "seeded") run("pnpm", ["db:seed"], { ...login, COMPANY_PROFILE: "demo", SEED_VOLUME: process.env.SEED_VOLUME || "off" });
  else run(process.execPath, ["scripts/bootstrap-database.cjs"], { ...login, COMPANY_PROFILE: "" });
  run(process.execPath, ["tests/e2e/fixtures/ensure-users.cjs"]);
  console.log(`${database}: ${mode} database ready`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
