// Provision only initial settings, roles/grants and the first admin. Never reset existing rows.
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
const { db } = require("../packages/database/src/db.ts");
const {
  ALL_ROLES,
  ALL_RESOURCES,
  ALL_ACTIONS,
  DEFAULT_ROLE_RULES,
} = require("../packages/database/src/queries/permissions.ts");
const {
  company,
} = require("../packages/database/src/initial-company-config.json");
const { createRequire } = require("node:module");
const bcrypt = createRequire(
  require.resolve("../packages/database/package.json"),
)("bcryptjs");
async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12
  )
    throw new Error(
      "Set SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters",
    );
  if (Buffer.byteLength(password,"utf8") > 72) throw new Error("Bootstrap password exceeds bcrypt byte limit");
  let initialCompany = company;
  if (process.env.COMPANY_CONFIG_FILE) initialCompany = JSON.parse(require("node:fs").readFileSync(process.env.COMPANY_CONFIG_FILE,"utf8"));
  else if (process.env.NODE_ENV === "production") throw new Error("Production bootstrap requires COMPANY_CONFIG_FILE with approved business identity");
  if (!initialCompany.companyNameEn?.trim() || !initialCompany.companyNameAr?.trim()) throw new Error("Company names are required");
  const hash = await bcrypt.hash(password, 10);
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(19041004)::text`;
      const count = await tx.companySetting.count();
      if (count > 1)
        throw new Error(
          "Multiple company settings rows require manual reconciliation",
        );
      if (!count) await tx.companySetting.create({ data: initialCompany });
      for (const role of ALL_ROLES) {
        await tx.role.upsert({
          where: { id: role },
          update: {},
          create: {
            id: role,
            nameEn: role.replaceAll("_", " "),
            nameAr: role.replaceAll("_", " "),
            isSystem: true,
          },
        });
      }
      await tx.permission.createMany({
        skipDuplicates: true,
        data: ALL_ROLES.flatMap((role) =>
          ALL_RESOURCES.flatMap((resource) =>
            ALL_ACTIONS.map((action) => ({
              role,
              resource,
              action,
              allowed:
                role === "super_admin" ||
                (DEFAULT_ROLE_RULES[role][resource] || []).includes(action),
            })),
          ),
        ),
      });
      const prior = await tx.user.findUnique({
        where: { email },
        select: { role: true },
      });
      if (prior && prior.role !== "super_admin")
        throw new Error(
          "Bootstrap email belongs to another role; choose the existing super administrator email",
        );
      if (!prior)
        await tx.user.create({
          data: {
            email,
            passwordHash: hash,
            fullName: process.env.SUPER_ADMIN_NAME || "Super Admin",
            role: "super_admin",
          },
        });
    },
    { timeout: 15000 },
  );
  console.log(
    "Bootstrap complete. Existing accounts, company data and permission overrides preserved; no demo records created.",
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
