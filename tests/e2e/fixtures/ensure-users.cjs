// Run: node tests/e2e/fixtures/ensure-users.cjs
// Creates (or resets the password of) the disposable end-to-end accounts in users.json.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true } });
const { createRequire } = require("node:module");
const { db } = require("../../../packages/database/src/db.ts");
const bcrypt = createRequire(require.resolve("../../../packages/database/package.json"))("bcryptjs");
const users = require("./users.json");

async function main() {
  for (const [key, user] of Object.entries(users)) {
    if (key.startsWith("_")) continue;
    const passwordHash = await bcrypt.hash(user.password, 10);
    await db.user.upsert({
      where: { email: user.email },
      update: { passwordHash, role: user.role, isActive: true, mfaEnabled: false },
      create: { email: user.email, fullName: user.fullName, role: user.role, passwordHash },
    });
    console.log(`ready: ${user.email}`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
