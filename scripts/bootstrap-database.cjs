// Provisions the minimal clean database setup (roles, modules, sequences, base accounts)
// using pure SQL seeds.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
try {
  require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
} catch (e) {
  // dotenv loaded by runner
}

const run = (command, commandArgs, extra = {}) =>
  execFileSync(command, commandArgs, { cwd: root, stdio: "inherit", env: { ...process.env, ...extra } });

async function main() {
  const profile = process.env.COMPANY_PROFILE?.trim();

  if (profile) {
    const seedTarget = (profile === "demo" || profile === "northwind") ? "northwind" : "ishoot";
    console.log(`Bootstrapping database with full profile "${seedTarget}"...`);
    run(path.join(root, "run.sh"), ["db", "seed", seedTarget]);
  } else {
    console.log("Bootstrapping minimal clean database (pure SQL)...");
    run(path.join(root, "run.sh"), ["db", "bootstrap"]);
  }

  console.log("Bootstrap complete. System is ready.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
