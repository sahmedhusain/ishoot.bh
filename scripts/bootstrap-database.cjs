// Provision roles/grants, the first admin and the company row. Never reset existing rows.
// COMPANY_PROFILE=<name> installs company/profiles/<name> (identity, brand files, theme) and skips the setup
// wizard; without it the company starts blank and the admin's first-run setup wizard collects everything.
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
  loadCompanyProfile,
  installCompanyProfile,
  remapLegacyPublicFiles,
} = require("../company/tools/company-profile.ts");
const { DEFAULT_FEATURE_MODULES } = require("../packages/database/src/constants/features.ts");
const roleNames = { en: require("../packages/locales/src/common.cjs").withCommonCopy(require("../packages/locales/src/admin/en.json"), "admin", require("../packages/locales/src/common.cjs").commonEn).roles, ar: require("../packages/locales/src/common.cjs").withCommonCopy(require("../packages/locales/src/admin/ar.json"), "admin", require("../packages/locales/src/common.cjs").commonAr).roles };
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
  if (Buffer.byteLength(password, "utf8") > 72) throw new Error("Bootstrap password exceeds bcrypt byte limit");
  const profileName = process.env.COMPANY_PROFILE?.trim();
  const profile = profileName ? loadCompanyProfile(profileName) : null;
  const hash = await bcrypt.hash(password, 10);
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(19041004)::text`;
      const count = await tx.companySetting.count();
      if (count > 1)
        throw new Error(
          "Multiple company settings rows require manual reconciliation",
        );
      // A blank company: the setup wizard fills in names, brand and configuration on first sign-in.
      if (!count && !profile) await tx.companySetting.create({ data: { companyNameEn: "New company", companyNameAr: "شركة جديدة" } });
      for (const role of ALL_ROLES) {
        await tx.role.upsert({
          where: { id: role },
          update: {},
          create: {
            id: role,
            nameEn: roleNames.en[role] ?? role.replaceAll("_", " "),
            nameAr: roleNames.ar[role] ?? role.replaceAll("_", " "),
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
        select: { id: true, role: true },
      });
      if (prior && prior.role !== "super_admin")
        throw new Error(
          "Bootstrap email belongs to another role; choose the existing super administrator email",
        );
      await tx.featureToggle.createMany({ data: DEFAULT_FEATURE_MODULES.map((m) => ({ ...m })), skipDuplicates: true });
      const admin =
        prior ??
        (await tx.user.create({
          data: {
            email,
            passwordHash: hash,
            fullName: process.env.SUPER_ADMIN_NAME || "Super Admin",
            role: "super_admin",
          },
        }));
      if (profile && (!count || process.env.COMPANY_PROFILE_OVERWRITE === "1")) {
        await installCompanyProfile(tx, profile, admin.id, { markSetupComplete: true });
        const missing = await remapLegacyPublicFiles(tx, profile, admin.id);
        if (missing.length) console.warn(`No file in company/profiles/${profile.name}/assets for: ${missing.join(", ")}`);
      }
    },
    { timeout: 60000 },
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
