// Run: pnpm db:reset [--company <slug>] [--empty] [--yes]
// Local development only: wipes the local service volumes, re-applies every service migration,
// and initializes an empty database by default (or seeds a selected company from seeds/<slug>/).
// Refuses to run against anything but a database on this machine, or with NODE_ENV=production.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");

const root = path.resolve(__dirname, "..");
try {
  require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
} catch (e) {
  // dotenv not installed; environment should be loaded by run.sh
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);

const databaseUrl = process.env.DATABASE_DIRECT_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL in .env");
const url = new URL(databaseUrl);
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];
if (!LOCAL_HOSTS.includes(url.hostname)) {
  console.error(`Refusing to reset ${url.hostname}: db:reset only runs against a database on this machine.`);
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset with NODE_ENV=production.");
  process.exit(1);
}

function listAvailableCompanies() {
  const seedsDir = path.join(root, "seeds");
  if (!fs.existsSync(seedsDir)) return [];
  return fs
    .readdirSync(seedsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(seedsDir, entry.name, "seed.sql")))
    .map((entry) => {
      let label = entry.name;
      let activity = "";
      const companyJsonPath = path.join(seedsDir, entry.name, "company.json");
      if (fs.existsSync(companyJsonPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(companyJsonPath, "utf8"));
          label = parsed.company?.companyNameEn || parsed.display?.nameEn || entry.name;
          activity = parsed.company?.businessActivity || "";
        } catch {}
      }
      return { slug: entry.name, label, activity };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

let selectedCompany = option("company") || option("profile");

async function selectCompanyInteractive(companies) {
  if (flag("yes") || selectedCompany || flag("empty") || !process.stdin.isTTY) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nSelect database initialization mode:");
  console.log("  0) empty — Clean Empty Database (IT Setup Wizard) [Default]");
  companies.forEach((c, idx) => {
    const tag = c.activity ? ` [${c.activity}]` : "";
    console.log(`  ${idx + 1}) ${c.slug} — ${c.label}${tag}`);
  });

  const choice = (await rl.question(`\nEnter selection [0-${companies.length}] (default 0): `)).trim();
  rl.close();

  if (!choice || choice === "0") {
    selectedCompany = undefined;
    return;
  }
  const num = Number(choice);
  if (Number.isInteger(num) && num >= 1 && num <= companies.length) {
    selectedCompany = companies[num - 1].slug;
  } else if (companies.some((c) => c.slug === choice)) {
    selectedCompany = choice;
  } else {
    throw new Error(`Invalid selection "${choice}".`);
  }
}

const run = (command, commandArgs, extra = {}) =>
  execFileSync(command, commandArgs, { cwd: root, stdio: "inherit", env: { ...process.env, ...extra } });

function resetServiceData() {
  const compose = ["compose", "--env-file", path.join(root, ".env")];
  run("node", ["scripts/env-tool.cjs", "service-keys"]);
  run("docker", [...compose, "down", "--volumes", "--remove-orphans"]);
  run("docker", [...compose, "up", "-d", "--build", "--wait"]);
}

async function confirm(target) {
  if (flag("yes")) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This deletes every record and uploaded file in ${target}. Type "reset" to continue: `);
  rl.close();
  if (answer.trim() !== "reset") {
    console.log("Cancelled; nothing was changed.");
    process.exit(0);
  }
}

async function main() {
  const companies = listAvailableCompanies();
  await selectCompanyInteractive(companies);

  if (flag("empty")) {
    selectedCompany = undefined;
  }

  if (selectedCompany && !companies.some((c) => c.slug === selectedCompany)) {
    throw new Error(`Unknown seed company "${selectedCompany}". Available: ${companies.map((c) => c.slug).join(", ")}`);
  }

  const mode = selectedCompany ? "seed" : "empty";
  const target = `${url.hostname}:${url.port || 5432}${url.pathname}`;

  console.log(`Database: ${target}\nMode: ${mode}${selectedCompany ? ` (company "${selectedCompany}")` : " (clean empty database)"}`);
  await confirm(target);

  resetServiceData();
  run(path.join(root, "run.sh"), ["db", "migrate"]);

  if (mode === "empty") {
    run(path.join(root, "run.sh"), ["db", "bootstrap"]);
    console.log("\nEmpty database ready. Sign in to the IT Console (IT_ADMIN_USERNAME / BA0001 from .env) to run the setup wizard.");
    return;
  }

  run(path.join(root, "run.sh"), ["db", "seed", selectedCompany]);
  run("node", ["scripts/verify-seed-dates.js"]);
  console.log(`\nSeeded database ready for "${selectedCompany}".`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
