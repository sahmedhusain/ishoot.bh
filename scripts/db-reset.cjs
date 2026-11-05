// Run: pnpm db:reset [--profile <name> | --demo <preset>] [--style <style>] [--empty] [--light] [--yes]
// Local development only: wipes the local service volumes, re-applies every service migration and fills it again.
//   (default)  demo business data for COMPANY_PROFILE (or --profile, default "ishoot"), full volume
//   --light    the same without the large generated volume (faster)
//   --empty    no demo data: roles, permissions and SUPER_ADMIN only; the admin then shows the setup wizard
// Refuses to run against anything but a database on this machine, or with NODE_ENV=production.
const { execFileSync } = require("node:child_process");
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

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
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

let demo = option("demo") || process.env.SEED_PRESET?.trim();
const style = option("style") || process.env.SEED_STYLE?.trim();
let profile = option("profile") || process.env.COMPANY_PROFILE?.trim();

if (profile === "all") {
  demo = "all";
  profile = "demo";
}

async function selectProfileInteractive() {
  if (flag("yes") || option("profile") || option("demo") || flag("empty") || !process.stdin.isTTY) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nSelect company profile or demo workspace:");
  console.log("  1) ishoot   — iShoot Cinema Production S.P.C. (Default)");
  console.log("  2) demo     — Northwind Traders / Harbor Projects W.L.L.");
  console.log("  3) media    — Media & Production Preset");
  console.log("  4) commerce — Store & Commerce Preset");
  console.log("  5) services — Professional Services Preset");
  console.log("  6) all      — All Business Modules Enabled");
  console.log("  7) empty    — Empty Database (Setup Wizard)");

  const choice = (await rl.question("\nEnter selection [1-7] (default 1): ")).trim();
  rl.close();

  switch (choice) {
    case "2":
      profile = "demo";
      demo = undefined;
      break;
    case "3":
      demo = "media";
      profile = "demo";
      break;
    case "4":
      demo = "commerce";
      profile = "demo";
      break;
    case "5":
      demo = "services";
      profile = "demo";
      break;
    case "6":
      demo = "all";
      profile = "demo";
      break;
    case "7":
      args.push("--empty");
      break;
    case "1":
    default:
      profile = "ishoot";
      demo = undefined;
      break;
  }
}

if (flag("demo") && (!option("demo") || option("demo").startsWith("--"))) throw new Error("--demo needs a preset; run pnpm db:demo:list");
if (flag("style") && (!option("style") || option("style").startsWith("--"))) throw new Error("--style needs a style; run pnpm db:demo:list");
if (demo && flag("profile") && option("profile") !== "all") throw new Error("Choose --demo or --profile; demo presets use the shared demo company.");
if (flag("empty") && (demo || style)) throw new Error("--empty cannot be combined with a demo preset or style.");

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
  await selectProfileInteractive();

  if (demo || style) {
    require("ts-node").register({ project: path.join(root, "company/tsconfig.json") });
    const { demoPreset } = require("../company/seed/demo-presets.ts");
    demoPreset(demo || "media", style);
  }

  profile = demo ? "demo" : profile || "ishoot";
  const mode = flag("empty") ? "empty" : flag("light") ? "light" : "full";
  const target = `${url.hostname}:${url.port || 5432}${url.pathname}`;

  console.log(`Database: ${target}\nMode: ${mode}${mode === "empty" ? "" : ` (company profile "${profile}"${demo ? `, demo "${demo}"` : ""}${style ? `, style "${style}"` : ""})`}`);
  await confirm(target);

  resetServiceData();
  run(path.join(root, "run.sh"), ["db", "migrate"]);
  run(process.execPath, ["scripts/bootstrap-database.cjs"], { COMPANY_PROFILE: mode === "empty" ? "" : profile });

  if (mode === "empty") {
    console.log("\nEmpty database ready. Sign in with SUPER_ADMIN_EMAIL to run the setup wizard.");
    return;
  }
  run("npm", ["--prefix", "company", "run", "seed"], { COMPANY_PROFILE: profile, SEED_PRESET: demo || "", SEED_STYLE: style || "" });
  run("npm", ["--prefix", "company", "run", "check:demo"], { COMPANY_PROFILE: profile, SEED_PRESET: demo || "" });
  console.log(`\nDemo service data ready for "${profile}".`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
