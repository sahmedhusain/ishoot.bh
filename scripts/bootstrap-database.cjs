// Provisions the minimal clean database setup (roles, modules, sequences, base accounts)
// using pure SQL bootstrap.
const { execFileSync } = require("node:child_process");
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
  console.log("Bootstrapping minimal clean database (pure SQL)...");
  run(path.join(root, "run.sh"), ["db", "bootstrap"]);
  console.log("Bootstrap complete. System is ready.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
