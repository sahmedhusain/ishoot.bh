// Run: node tests/e2e/it-account.cjs
// Creates the end-to-end IT account with identity's bootstrap-it command in the Compose stack and keeps its
// password and authenticator secret in tests/e2e/.results/it-account.json (ignored by git, never uploaded) for tests/e2e/specs/it.
// Bootstrapping runs once per database, so an existing file is kept as it is. E2E_IT_ACCOUNT_FILE names another file, for a
// second stack (with COMPOSE_ARGS="-p <project> --env-file <file>").
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const target = path.resolve(
  process.env.E2E_IT_ACCOUNT_FILE || path.join(__dirname, ".results/it-account.json"),
);
if (fs.existsSync(target)) {
  console.log("IT account: kept", path.relative(process.cwd(), target));
  process.exit(0);
}
let loginEmail = process.env.E2E_IT_EMAIL || "e2e-it@example.test";
const password = crypto.randomBytes(18).toString("base64url");
const bootstrapArgs = [
  "compose",
  ...(process.env.COMPOSE_ARGS?.split(" ").filter(Boolean) ?? []),
  "run",
  "--rm",
  "-T",
  "identity",
  "bootstrap-it",
  "-email",
  loginEmail,
];
let output;
try {
  output = execFileSync("docker", bootstrapArgs, {
    input: password + "\n",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch {
  loginEmail = process.env.E2E_IT_RECOVER_EMAIL || "admin@example.com";
  const recoverArgs = [
    "compose",
    ...(process.env.COMPOSE_ARGS?.split(" ").filter(Boolean) ?? []),
    "run",
    "--rm",
    "-T",
    "identity",
    "recover-it",
    "-email",
    loginEmail,
    "-actor",
    "e2e-runner",
  ];
  output = execFileSync("docker", recoverArgs, {
    input: password + "\n",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
}
const secret = output.match(/secret: ([A-Z2-7]+)/)?.[1];
if (!secret) throw new Error("bootstrap-it/recover-it printed no authenticator secret");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify({ email: loginEmail, password, secret }), {
  mode: 0o600,
});
console.log("IT account: ready", loginEmail);
