// Run: node tests/e2e/fixtures/ensure-users.cjs
// Creates (or resets the password of) the disposable end-to-end accounts in users.json.
require("dotenv").config({ quiet: true });
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    esModuleInterop: true,
  },
});
const { createRequire } = require("node:module");
const { db } = require("../../../packages/database/src/db.ts");
const {
  createEmployee,
} = require("../../../packages/database/src/queries/hrms.ts");
const bcrypt = createRequire(
  require.resolve("../../../packages/database/package.json"),
)("bcryptjs");
const users = require("./users.json");

async function main() {
  for (const [key, user] of Object.entries(users)) {
    if (key.startsWith("_")) continue;
    const passwordHash = await bcrypt.hash(user.password, 10);
    const account = await db.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        role: user.role,
        isActive: true,
        mfaEnabled: false,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        passwordHash,
      },
    });
    // Staff fixtures must satisfy the same HR integrity rules as seeded staff.
    // Reuse the domain helper for the EMP sequence and current employment record.
    if (user.role !== "viewer") {
      const existing = await db.employee.findUnique({
        where: { userId: account.id },
      });
      if (!existing) {
        await createEmployee(
          {
            userId: account.id,
            firstNameEn: key === "driver" ? "Dana" : "E2E",
            lastNameEn: key === "driver" ? "Driver" : key,
            firstNameAr: key === "driver" ? "دانة" : "اختبار",
            lastNameAr: key === "driver" ? "السائقة" : key,
            email: user.email,
            jobTitleEn: key === "driver" ? "Driver" : user.role,
            jobTitleAr: key === "driver" ? "سائقة" : user.role,
            hireDate: new Date("2020-01-01T00:00:00Z"),
            basicSalary: 0,
          },
          account.id,
        );
      } else if (key === "driver") {
        await db.employee.update({
          where: { id: existing.id },
          data: {
            firstNameEn: "Dana",
            lastNameEn: "Driver",
            firstNameAr: "دانة",
            lastNameAr: "السائقة",
          },
        });
      }
    }
    console.log(`ready: ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
