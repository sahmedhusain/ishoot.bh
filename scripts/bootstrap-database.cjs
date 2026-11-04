// Provisions the first IT administrator through identity, then optionally installs a company profile through
// the system and files APIs. It intentionally has no direct database client.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
try {
  require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
} catch (e) {
  try {
    require(path.join(root, "company/node_modules/dotenv")).config({ path: path.join(root, ".env"), quiet: true });
  } catch (err) {}
}
try {
  require("ts-node").register({ project: path.resolve(__dirname, "../company/tsconfig.json") });
} catch (e) {
  try {
    require(path.join(root, "company/node_modules/ts-node")).register({ project: path.resolve(__dirname, "../company/tsconfig.json") });
  } catch (err) {}
}

const { loadCompanyProfile, installCompanyProfile } = require("../company/tools/company-profile.ts");

function requireCredential() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12)
    throw new Error("Set SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters");
  return { email, password };
}

function identityCommand() {
  const binary = path.join(root, "backend/bin/identity");
  return require("node:fs").existsSync(binary)
    ? [binary, ["bootstrap-it"]]
    : ["go", ["run", "./services/identity/cmd/api", "bootstrap-it"]];
}

async function main() {
  const { email, password } = requireCredential();
  const [command, args] = identityCommand();
  try {
    execFileSync(command, [...args, "-email", email], {
      cwd: command === "go" ? path.join(root, "backend") : root,
      input: `${password}\n`,
      stdio: ["pipe", "inherit", "inherit"],
      env: { SERVICE_NAME: "identity", ...process.env },
    });
  } catch (err) {
    if (!err.message?.includes("an IT account already exists") && !err.stdout?.toString().includes("an IT account already exists")) {
      // Ignore if account already exists
    }
  }
  const { syncAccount, setAccountPassword } = require("../apps/admin/lib/api/identity");
  await syncAccount("staff", "super-admin", { email, roles: ["super_admin"], active: true });
  await setAccountPassword("staff", "super-admin", { password });

  const name = process.env.COMPANY_PROFILE?.trim();
  if (name) await installCompanyProfile(loadCompanyProfile(name), "bootstrap");
  console.log("Bootstrap complete. The identity, system and files services own all persisted setup data.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
