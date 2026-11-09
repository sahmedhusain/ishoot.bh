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
const email = process.env.E2E_IT_EMAIL || "e2e-it@example.test";
const password = crypto.randomBytes(18).toString("base64url");
const args = [
  "compose",
  ...(process.env.COMPOSE_ARGS?.split(" ").filter(Boolean) ?? []),
  "run",
  "--rm",
  "-T",
  "identity",
  "bootstrap-it",
  "-email",
  email,
];
const output = execFileSync("docker", args, {
  input: password + "\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "inherit"],
});
const secret = output.match(/secret: ([A-Z2-7]+)/)?.[1];
if (!secret) throw new Error("bootstrap-it printed no authenticator secret");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify({ email, password, secret }), {
  mode: 0o600,
});
console.log("IT account: created", email);
