// Run: pnpm db:reset [--profile <name> | --demo <preset>] [--style <style>] [--empty] [--light] [--yes]
// Local development only: wipes the database in DATABASE_URL and the uploaded files, re-applies every migration
// and fills it again.
//   (default)  demo business data for COMPANY_PROFILE (or --profile, default "demo"), full volume
//   --light    the same without the large generated volume (faster)
//   --empty    no demo data: roles, permissions and SUPER_ADMIN only; the admin then shows the setup wizard
// Refuses to run against anything but a database on this machine, or with NODE_ENV=production.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });

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

if (flag("demo") && (!option("demo") || option("demo").startsWith("--"))) throw new Error("--demo needs a preset; run pnpm db:demo:list");
if (flag("style") && (!option("style") || option("style").startsWith("--"))) throw new Error("--style needs a style; run pnpm db:demo:list");
if (demo && flag("profile") && option("profile") !== "all") throw new Error("Choose --demo or --profile; demo presets use the shared demo company.");
if (flag("empty") && (demo || style)) throw new Error("--empty cannot be combined with a demo preset or style.");
// Validate before the destructive reset, including values inherited from .env.
if (demo || style) {
  require("ts-node").register({ project: path.join(root, "company/tsconfig.json") });
  const { demoPreset } = require("../company/seed/demo-presets.ts");
  demoPreset(demo || "media", style);
}
profile = demo ? "demo" : profile || "demo";
const mode = flag("empty") ? "empty" : flag("light") ? "light" : "full";
const target = `${url.hostname}:${url.port || 5432}${url.pathname}`;

async function confirm() {
  if (flag("yes")) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This deletes every record and uploaded file in ${target}. Type "reset" to continue: `);
  rl.close();
  if (answer.trim() !== "reset") {
    console.log("Cancelled; nothing was changed.");
    process.exit(0);
  }
}

const run = (command, commandArgs, extra = {}) =>
  execFileSync(command, commandArgs, { cwd: root, stdio: "inherit", env: { ...process.env, ...extra } });

/** Empties local upload storage, or the two Supabase buckets (creating them if missing). */
async function resetUploads() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (supabaseUrl && serviceKey) {
    const host = new URL(supabaseUrl).hostname;
    if (!LOCAL_HOSTS.includes(host)) throw new Error(`Refusing to empty storage on ${host}; point SUPABASE_URL at the local stack.`);
    const { createClient } = createRequire(path.join(root, "packages/database/package.json"))("@supabase/supabase-js");
    const storage = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }).storage;
    for (const [bucket, isPublic] of [["public-assets", true], ["private-assets", false]]) {
      const { error: missing } = await storage.getBucket(bucket);
      if (missing) {
        const { error } = await storage.createBucket(bucket, { public: isPublic, fileSizeLimit: "10MB" });
        if (error) throw new Error(`Could not create bucket ${bucket}: ${error.message}`);
        console.log(`Created storage bucket ${bucket} (${isPublic ? "public" : "private"})`);
        continue;
      }
      const { error } = await storage.emptyBucket(bucket);
      if (error) throw new Error(`Could not empty bucket ${bucket}: ${error.message}`);
      console.log(`Emptied storage bucket ${bucket}`);
    }
    return;
  }
  const uploadRoot = process.env.UPLOAD_ROOT ? path.resolve(process.env.UPLOAD_ROOT) : path.join(root, "apps/admin/private/uploads");
  fs.rmSync(uploadRoot, { recursive: true, force: true });
  fs.mkdirSync(uploadRoot, { recursive: true });
  console.log(`Emptied ${uploadRoot.startsWith(root + path.sep) ? path.relative(root, uploadRoot) : uploadRoot}`);
}

async function main() {
  console.log(`Database: ${target}\nMode: ${mode}${mode === "empty" ? "" : ` (company profile "${profile}"${demo ? `, demo "${demo}"` : ""}${style ? `, style "${style}"` : ""})`}`);
  await confirm();

  // Drops every table in the schema and re-applies all migrations from scratch.
  run(path.join(root, "node_modules/.bin/prisma"), ["migrate", "reset", "--force", "--skip-seed", "--skip-generate", "--schema", "packages/database/prisma/schema.prisma"]);
  run(path.join(root, "node_modules/.bin/prisma"), ["generate", "--schema", "packages/database/prisma/schema.prisma"]);
  await resetUploads();

  if (mode === "empty") {
    run(process.execPath, ["scripts/bootstrap-database.cjs"], { COMPANY_PROFILE: "" });
    console.log("\nEmpty database ready. Sign in with SUPER_ADMIN_EMAIL to run the setup wizard.");
    return;
  }
  run("pnpm", ["db:seed"], { COMPANY_PROFILE: profile, SEED_PRESET: demo || "", SEED_STYLE: style || "", SEED_VOLUME: mode === "light" ? "off" : "on" });
  run("pnpm", ["db:check-integrity"]);
  console.log(`\nDemo database ready for "${profile}". Every demo account uses SUPER_ADMIN_PASSWORD; the super admin is SUPER_ADMIN_EMAIL.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
