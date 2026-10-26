// Run: node scripts/env-tool.cjs <init|sync|secrets|check|keys> [--file <path>] [--production]
// Manages the root .env against .env.example. Never prints secret values.
//   init     copy .env.example to .env (refuses to overwrite), then fill in empty secrets
//   sync     add the variables .env.example defines and .env lacks (existing values are never changed)
//   secrets  generate every empty secret (JWT, revalidation, MFA, encryption, customer auth, cron, docker)
//   check    validate the values the apps need; --production adds the live-installation rules
//   keys     list each variable as set / empty / missing, and the ones the code no longer reads
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const command = args[0];
const fileArg = args.indexOf("--file");
const envFile = path.resolve(fileArg >= 0 ? args[fileArg + 1] : path.join(root, ".env"));
const exampleFile = path.join(root, ".env.example");
const production = args.includes("--production");

const SECRETS = {
  JWT_SECRET: () => crypto.randomBytes(48).toString("base64"),
  REVALIDATION_SECRET: () => crypto.randomBytes(32).toString("base64url"),
  MFA_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString("base64"),
  ENCRYPTION_KEY: () => crypto.randomBytes(16).toString("hex"),
  CUSTOMER_AUTH_SECRET: () => crypto.randomBytes(32).toString("base64url"),
  CRON_SECRET: () => crypto.randomBytes(32).toString("base64url"),
  POSTGRES_PASSWORD: () => crypto.randomBytes(18).toString("base64url"),
  PGADMIN_DEFAULT_PASSWORD: () => crypto.randomBytes(18).toString("base64url"),
};
// Variables older versions of .env.example listed that no code reads any more.
const RETIRED = {
  NEXT_PUBLIC_DEFAULT_LOCALE: "the main language is set in the setup wizard (Settings → Company)",
  WHATSAPP_API_TOKEN: "set in Settings → Integrations → WhatsApp",
  WHATSAPP_PHONE_ID: "set in Settings → Integrations → WhatsApp",
  FACEBOOK_APP_ID: "set in Settings → Integrations",
  FACEBOOK_APP_SECRET: "set in Settings → Integrations",
};

const LINE = /^\s*(#\s*)?([A-Z][A-Z0-9_]*)=(.*)$/;
function parse(text) {
  const entries = new Map();
  text.split(/\r?\n/).forEach((line, index) => {
    const match = LINE.exec(line);
    if (!match) return;
    const [, commented, key, rest] = match;
    if (entries.has(key) && !entries.get(key).commented) return;
    entries.set(key, { commented: Boolean(commented), value: unquote(rest), line, index });
  });
  return entries;
}
function unquote(rest) {
  const trimmed = rest.trim();
  if (trimmed.startsWith('"')) return trimmed.slice(1, trimmed.indexOf('"', 1) >= 0 ? trimmed.indexOf('"', 1) : undefined);
  if (trimmed.startsWith("'")) return trimmed.slice(1, trimmed.indexOf("'", 1) >= 0 ? trimmed.indexOf("'", 1) : undefined);
  return trimmed.replace(/\s+#.*$/, "");
}
const shown = (file) => (file.startsWith(root + path.sep) ? path.relative(root, file) : file);
const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

function setValue(text, key, value) {
  const lines = text.split("\n");
  const at = lines.findIndex((line) => new RegExp(`^\\s*${key}=`).test(line));
  const quoted = `${key}="${value}"`;
  if (at < 0) return `${text.replace(/\n*$/, "\n")}${quoted}\n`;
  // Keep any trailing comment on the line.
  const comment = /^\s*[A-Z0-9_]+=("[^"]*"|'[^']*'|[^#\s]*)(\s+#.*)?$/.exec(lines[at])?.[2] ?? "";
  lines[at] = quoted + comment;
  return lines.join("\n");
}

function fillSecrets() {
  let text = read(envFile) ?? fail(`${shown(envFile)} does not exist; run: ./run.sh env init`);
  const env = parse(text);
  const filled = [];
  for (const [key, make] of Object.entries(SECRETS)) {
    const entry = env.get(key);
    if (entry && !entry.commented && entry.value) continue;
    text = setValue(text, key, make());
    filled.push(key);
  }
  fs.writeFileSync(envFile, text);
  console.log(filled.length ? `Generated: ${filled.join(", ")}` : "Every secret already has a value.");
}

function sync() {
  const example = read(exampleFile) ?? fail(".env.example is missing");
  const text = read(envFile) ?? fail(`${shown(envFile)} does not exist; run: ./run.sh env init`);
  const current = parse(text);
  const added = [];
  for (const line of example.split(/\r?\n/)) {
    const match = LINE.exec(line);
    if (!match || match[1] || current.has(match[2])) continue;
    added.push(line);
  }
  if (!added.length) return console.log(`${shown(envFile)} already has every variable from .env.example.`);
  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(envFile, `${text.replace(/\n*$/, "\n")}\n# Added from .env.example by \`./run.sh env sync\` on ${stamp}\n${added.join("\n")}\n`);
  console.log(`Added ${added.length}: ${added.map((l) => LINE.exec(l)[2]).join(", ")}`);
}

function check() {
  const text = read(envFile) ?? fail(`${shown(envFile)} does not exist; run: ./run.sh env init`);
  const env = Object.fromEntries([...parse(text)].filter(([, e]) => !e.commented).map(([k, e]) => [k, e.value]));
  const problems = [];
  const warnings = [];
  const need = (ok, message, list = problems) => ok || list.push(message);
  for (const key of ["DATABASE_URL", "DIRECT_URL", "WEB_URL", "ADMIN_URL", "NEXT_PUBLIC_WEB_URL", "NEXT_PUBLIC_ADMIN_URL"]) need(!!env[key], `${key} is empty`);
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!env[key]) continue;
    try {
      need(["postgres:", "postgresql:"].includes(new URL(env[key]).protocol), `${key} is not a PostgreSQL URL`);
    } catch {
      problems.push(`${key} is not a valid URL`);
    }
  }
  need(Buffer.byteLength(env.JWT_SECRET || "") >= 32, "JWT_SECRET needs at least 32 bytes");
  need(!!env.REVALIDATION_SECRET, "REVALIDATION_SECRET is empty");
  need(Buffer.from(env.MFA_ENCRYPTION_KEY || "", "base64").length === 32, "MFA_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  need(Buffer.byteLength(env.ENCRYPTION_KEY || "", "utf8") === 32, "ENCRYPTION_KEY must be exactly 32 characters");
  need(!env.SUPER_ADMIN_PASSWORD || (Buffer.byteLength(env.SUPER_ADMIN_PASSWORD) >= 12 && Buffer.byteLength(env.SUPER_ADMIN_PASSWORD) <= 72), "SUPER_ADMIN_PASSWORD must be 12 to 72 bytes");
  need(!!env.SUPER_ADMIN_EMAIL && !!env.SUPER_ADMIN_PASSWORD, "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are needed to seed or bootstrap", warnings);
  need(!!env.SUPABASE_URL || !production, "SUPABASE_URL is empty: files would be kept on local disk");
  need(!env.SUPABASE_URL || !!env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY is empty: files are kept on local disk instead of Supabase Storage", production ? problems : warnings);
  need(!!env.CRON_SECRET, "CRON_SECRET is empty: /api/cron (reminders, payments, tracking, reports) cannot run", production ? problems : warnings);
  need(!!env.RESEND_API_KEY && !!env.FROM_EMAIL, "No legacy mail credentials: configure the encrypted Resend integration in Settings", warnings);
  need(!!env.RESEND_WEBHOOK_SECRET, "No legacy webhook secret: configure the signing secret in the encrypted Resend integration", warnings);
  need(!!env.CUSTOMER_AUTH_SECRET, "CUSTOMER_AUTH_SECRET is empty: customer sign-in falls back to REVALIDATION_SECRET", warnings);
  if (production) {
    need(env.NODE_ENV === "production", 'NODE_ENV should be "production"');
    for (const key of Object.keys(env).filter((k) => /^(PAYMENT_GATEWAY|COURIER)_BASE_URL_/.test(k) && env[k])) problems.push(`${key} points at a sandbox; remove it in production`);
    for (const key of ["WEB_URL", "ADMIN_URL"]) need(!/localhost|127\.0\.0\.1/.test(env[key] || ""), `${key} still points at this machine`);
  }
  for (const key of Object.keys(RETIRED)) if (key in env) warnings.push(`${key} is no longer read (${RETIRED[key]})`);
  for (const message of problems) console.error(`FAIL  ${message}`);
  for (const message of warnings) console.warn(`WARN  ${message}`);
  console.log(problems.length ? `${problems.length} problem(s) in ${shown(envFile)}` : `${shown(envFile)} looks good${production ? " for production" : ""}.`);
  if (problems.length) process.exitCode = 1;
}

function keys() {
  const example = parse(read(exampleFile) ?? fail(".env.example is missing"));
  const current = parse(read(envFile) ?? fail(`${shown(envFile)} does not exist; run: ./run.sh env init`));
  const width = Math.max(...[...example.keys()].map((k) => k.length));
  for (const [key, entry] of example) {
    const mine = current.get(key);
    const state = !mine || mine.commented ? (entry.commented ? "optional, unset" : "MISSING") : mine.value ? "set" : "empty";
    console.log(`${key.padEnd(width)}  ${state}`);
  }
  for (const [key, entry] of current) if (!example.has(key) && !entry.commented) console.log(`${key.padEnd(width)}  ${RETIRED[key] ? `retired: ${RETIRED[key]}` : "not in .env.example"}`);
}

switch (command) {
  case "init":
    if (fs.existsSync(envFile)) fail(`${shown(envFile)} already exists; use: ./run.sh env sync`);
    fs.copyFileSync(exampleFile, envFile);
    console.log(`Created ${shown(envFile)} from .env.example.`);
    fillSecrets();
    break;
  case "sync":
    sync();
    break;
  case "secrets":
    fillSecrets();
    break;
  case "check":
    check();
    break;
  case "keys":
    keys();
    break;
  default:
    fail("Usage: node scripts/env-tool.cjs <init|sync|secrets|check|keys> [--file <path>] [--production]");
}
