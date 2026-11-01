require("ts-node").register({ moduleTypes: { "../packages/config/src/**/*.ts": "cjs", "packages/config/src/**/*.ts": "cjs" }, transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const { realConstants } = require("./lib/real-constants.cjs");
// Exercise actual server-action boundaries without a network or database.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks) {
  if (mocks["@platform/locales"]) mocks["@platform/locales"] = { ...realConstants(file, "@platform/locales"), ...mocks["@platform/locales"] };
  if (mocks["@platform/database"]) { mocks["@platform/database"].requireFeatureEnabled ??= async () => { }; mocks["@platform/database"].runAtomicMutation ??= async (fn) => fn(); mocks["@platform/database"].measureOperation ??= async (_name, fn) => fn(); if (mocks["@platform/database"].db) mocks["@platform/database"].db.$queryRaw ??= async () => []; }
  mocks["../../lib/action-input"] ??= require("../apps/admin/lib/action-input.ts");
  mocks["../services/uploads"] ??= { claimUpload: async () => ({ fileSize: 1, mimeType: "application/pdf" }) };
  if (mocks["../db"]?.db) mocks["../db"].db.featureToggle ??= { findUnique: async () => null, findMany: async () => [] };

  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (id) => {
        if (id === "node:crypto") return require(id);
        if (id === "../../lib/pdf/mom-pdf") return {};
        id = ((i, m) => i in m ? i : (i.startsWith('@platform/database/') && '@platform/database' in m ? '@platform/database' : i))(id, mocks);
        if (!(id in mocks)) { const real = realConstants(file, id); if (real) return real; throw Error(`Missing mock ${id}`); }
        return mocks[id];
      },
      console,
      Date,
      Set,
      Map,
      Buffer,
      URL,
      Error,
      process,
    },
  );
  return module.exports;
}
async function main() {
  let actor = { id: "u", role: "viewer" },
    touched = false;
  const mom = load("apps/admin/app/actions/mom.ts", {
    "../../lib/auth": {
      requirePermission: async (resource, action) => {
        assert.equal(resource, "moms");
        if (actor.role !== "super_admin") throw Error(`Denied ${action}`);
        return actor;
      },
      getCurrentUser: async () => actor,
    },
    "next/cache": { revalidatePath() { } },
    "@platform/database": {
      createMinuteOfMeeting: async () => {
        touched = true;
      },
      getMinuteOfMeetingById: async () => ({ id: "m", status: "draft" }),
      createActivityLog: async () => {
        touched = true;
      },
      getSignatureMode: async () => "stored",
      approveAndSignMom: async () => {
        touched = true;
      },
    },
  });
  await assert.rejects(mom.approveAndSignMomAction("m"), /Denied approve/);
  await assert.rejects(
    mom.shareMomViaEmailAction("m", "x@example.com"),
    /Denied export/,
  );
  assert.equal(touched, false);
  actor = { id: "s", role: "super_admin" };
  await assert.rejects(
    mom.approveAndSignMomAction("m"),
    /Configure your signature/,
  );
  await assert.rejects(
    mom.updateMomAction("m", { approvedById: "forged" }),
    /Approval fields/,
  );
  await assert.rejects(
    mom.updateMomAction("m", { status: "approved" }),
    /approval action/,
  );
  await assert.rejects(mom.shareMomViaEmailAction("m", "x@example.com"), /Approve the meeting/);
  assert.equal(touched, false, "unapproved sharing must not log success");

  // Roles save only the cells that changed; cells not submitted keep their stored value.
  let stored = [],
    upserts = [],
    fail = false;
  const transaction = {
    role: { update: async ({ where }) => ({ id: where.id }) },
    permission: {
      findMany: async () => stored,
      upsert: async (args) => {
        if (fail) throw Error("DB failure");
        upserts.push(args);
      },
    },
    activityLog: { create: async () => { } },
  };
  const roles = load("apps/admin/app/actions/roles.ts", {
    "../../lib/auth": { requirePermission: async () => actor },
    "next/cache": { revalidatePath() { } },
    "@platform/database": {
      ALL_RESOURCES: ["invoices", "moms"],
      ALL_ACTIONS: ["read", "write", "delete", "export", "approve", "create", "edit"],
      db: { $transaction: async (fn) => fn(transaction) },
    },
  });
  actor = { id: "a", role: "admin" };
  await assert.rejects(roles.upsertRoleAction({ nameEn: "Admin", nameAr: "مدير", grants: {} }), /Only super/);
  actor = { id: "s", role: "super_admin" };
  stored = [
    { resource: "invoices", action: "read", allowed: false },
    { resource: "moms", action: "approve", allowed: true },
  ];
  await roles.upsertRoleAction({
    id: "admin",
    nameEn: "Admin",
    nameAr: "مدير",
    grants: { "invoices:read": true, "invoices:export": true },
  });
  const grantOf = (key) => upserts.find((u) => `${u.where.role_resource_action.resource}:${u.where.role_resource_action.action}` === key);
  assert.equal(upserts.length, 2, "only changed cells are written");
  assert.equal(grantOf("invoices:read").update.allowed, true);
  assert.equal(grantOf("invoices:export").create.allowed, true);
  assert.equal(grantOf("moms:approve"), undefined, "cells not shown in the payload are never revoked");
  await assert.rejects(
    roles.upsertRoleAction({ id: "admin", nameEn: "Admin", nameAr: "مدير", grants: { "invoices:write": true } }),
    /Invalid permission resource/,
    "the legacy write grant is derived, never submitted",
  );
  upserts = [];
  stored = [];
  await roles.upsertRoleAction({ id: "super_admin", nameEn: "Super", nameAr: "مدير", grants: { "invoices:read": false } });
  assert.equal(upserts.length, 14);
  assert.equal(upserts.every((u) => u.create.allowed && u.update.allowed), true, "Super Admin retains all grants even when a denial is submitted");
  fail = true;
  await assert.rejects(
    roles.upsertRoleAction({ id: "admin", nameEn: "Admin", nameAr: "مدير", grants: { "invoices:delete": true } }),
    /DB failure/,
  );
  let updateData = null;
  const users = load("apps/admin/app/actions/users.ts", {
    "../../lib/auth": { requirePermission: async () => actor },
    "next/cache": { revalidatePath() { } },
    "@platform/database": {
      getUserById: async () => ({ id: "t", role: "viewer" }),
      getEffectivePermissions: async () => ({ "deals:read": true }),
      db: { role: { findUnique: async () => ({ id: "super_admin" }) } },
      updateUser: async (id, data) => {
        updateData = data;
        return { id };
      },
      createActivityLog: async () => { },
    },
  });
  actor = { id: "a", role: "admin" };
  await assert.rejects(
    users.updateUserAction("t", { role: "super_admin" }),
    /Only super/,
  );
  await assert.rejects(users.updateUserAction("t", { full_name: "Updated", permissions: { "users:write": true } }), /Invalid input/);
  assert.equal(updateData, null, "forged override must reject before mutation");

  await assert.rejects(
    users.createUserAction({
      employeeId: "employee-first",
      email: "new@example.invalid",
      full_name: "New",
      role: "viewer",
    }),
    /Password must/,
  );
  await assert.rejects(
    users.createUserAction({
      employeeId: "employee-first",
      email: "new@example.invalid",
      full_name: "New",
      role: "viewer",
      password: "short",
    }),
    /Password must/,
  );
  await assert.rejects(
    users.updateUserAction("t", { password: "short" }),
    /Password must/,
  );
  const translations = require("../packages/locales/src/common.cjs").withCommonCopy(require("../packages/locales/src/en.json"), "web", require("../packages/locales/src/common.cjs").commonEn);
  const emailTemplates = load(
    "packages/email/src/templates/html-templates.ts",
    { "@platform/locales": { getTranslations: () => translations } },
  );
  const hostile = "<img src=x onerror=alert(1)>";
  const html = emailTemplates.createInquiryConfirmationEmail(
    hostile,
    [hostile],
    "en",
    { nameEn: hostile, nameAr: hostile, website: "javascript:alert(1)" },
  );
  assert.ok(!html.includes(hostile));
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes('href="javascript:'));
  const publicCompany = load("apps/web/lib/company.ts", {
    react: { cache: (fn) => fn },
    "next/cache": { unstable_cache: (fn) => fn },
    "@platform/database": {
      getCompanySettings: async () => ({
        company_name_en: "Stored name",
        bank_iban: "sensitive",
        signature_url: "/private",
        invoice_next_number: 999,
        internalFutureField: "hidden",
      }),
    },
  });
  const publicSettings = await publicCompany.getPublicCompanySettings();
  assert.equal(publicSettings.company_name_en, "Stored name");
  for (const field of [
    "bank_iban",
    "signature_url",
    "invoice_next_number",
    "internalFutureField",
  ])
    assert.ok(!(field in publicSettings));

  let user = null,
    allowed = false,
    fetched = false;
  class Response {
    constructor(body, options) {
      this.body = body;
      this.status = options?.status || 200;
      this.headers = options?.headers;
    }
  }
  const feed = load("apps/admin/app/api/calendar/feed/route.ts", {
    "next/server": { NextResponse: Response },
    "../../../../lib/auth": { getCurrentUser: async () => user, hasPermission: async () => allowed },
    "../../../../lib/ics": require("../apps/admin/lib/ics.ts"),
    "../../../../lib/public-origin": { publicOrigin: async () => "https://portal.example.com" },
    "@platform/database": {
      hasPermission: async () => allowed,
      getCompanySettings: async () => ({ company_name_en: "Test Company", company_name_ar: "شركة اختبار" }),
      getCalendarFor: async () => {
        fetched = true;
        return [
          {
            id: "e",
            title: "Shoot\r\nEND:VEVENT",
            start_date: "2026-10-01T09:00:00Z",
            end_date: "2026-10-01T10:00:00Z",
          },
        ];
      },
    },
  });
  assert.equal((await feed.GET({})).status, 401);
  user = { id: "v", role: "viewer" };
  assert.equal((await feed.GET({})).status, 403);
  assert.equal(fetched, false);
  allowed = true;
  const response = await feed.GET({});
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.ok(response.body.includes("SUMMARY:Shoot\\nEND:VEVENT"));
  const legal = load("apps/web/lib/legal-html.ts", {});
  const sanitized = legal.safeLegalHtml(
    '<p>Hello</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">Link</a>',
  );
  assert.ok(sanitized.startsWith("<p>Hello</p>"));
  assert.ok(
    !sanitized.includes("<script") &&
    !sanitized.includes("<img") &&
    !sanitized.includes("<a "),
  );
  assert.equal(
    legal
      .safeLegalHtml('<strong onclick="alert(1)">test</strong>')
      .includes("<strong onclick"),
    false,
  );
  const configured = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from("configured image")]);
  const asset = load("apps/admin/lib/pdf/configured-asset.ts", {
    sharp: () => { throw Error("an unreadable image falls back to its original bytes"); },
    "@platform/contracts": require("../contracts/src/index.ts"),
    // The files service refuses unknown or malformed addresses; here only one file exists.
    "@platform/api-client": { readFileBytes: async (url) => (url === "/api/files/brand/configured.png" ? configured : null) },
  });
  // Only uploaded company files resolve; the apps ship no public brand files any more.
  for (const url of [null, "https://external.invalid/stamp.png", "/brand/configured.png", "/api/files/brand/../../secret.png", "/api/files/brand/escape.png", "/api/files/brand/logo.svg"])
    assert.equal(await asset.resolveConfiguredPdfAsset(url), undefined);
  assert.deepEqual(await asset.resolveConfiguredPdfAsset("/api/files/brand/configured.png"), configured);
  const brokenReads = load("packages/database/src/queries/banners.ts", {
    "../db": {
      db: {
        heroBanner: {
          findMany: async () => {
            throw Error("Database unavailable");
          },
        },
      },
    },
  });
  await assert.rejects(brokenReads.getActiveBanners(), /Database unavailable/);
  await assert.rejects(brokenReads.getAllBanners(), /Database unavailable/);
  const brokenPermissions = load(
    "packages/database/src/queries/permissions.ts",
    {
      "../db": {
        db: {
          permission: {
            findMany: async () => {
              throw Error("Database unavailable");
            },
            findUnique: async () => {
              throw Error("Database unavailable");
            },
          },
        },
      },
    },
  );
  await assert.rejects(
    brokenPermissions.getAllPermissions(),
    /Database unavailable/,
  );
  assert.equal(
    await brokenPermissions.hasPermission("viewer", "calendar", "read"),
    false,
  );

  const buckets = new Map();
  const loginInput = load("apps/admin/lib/login-input.ts", { "@platform/database": { trustedClientIp: (h) => h.get("x-forwarded-for"), consumeAbuseLimit: async (scope, key, limit) => { const next = (buckets.get(key) || 0) + 1; buckets.set(key, next); if (next > limit) throw Error("RATE_LIMIT"); } } });
  const request = (ip, body) => ({
    headers: { get: (key) => (key === "x-forwarded-for" ? ip : null) },
    body: {
      getReader: () => {
        let done = false;
        return {
          read: async () =>
            done
              ? { done: true }
              : ((done = true), { done: false, value: Buffer.from(body) }),
          cancel: async () => { },
        };
      },
    },
  });
  await assert.rejects(
    loginInput.readLoginInput(request("bad", "null")),
    /INVALID_INPUT/,
  );
  await assert.rejects(
    loginInput.readLoginInput(request("large", "x".repeat(5000))),
    /INVALID_INPUT/,
  );
  for (let i = 0; i < 10; i++)
    await loginInput.readLoginInput(request("limited", "{}"));
  await assert.rejects(
    loginInput.readLoginInput(request("limited", "{}")),
    /RATE_LIMIT/,
  );
  console.log(
    "Audit security checks passed: calendar authentication/authorization, ICS injection, meeting approval/export/signature, role denials/export/transaction failures, privileged-user boundaries and forged override payloads.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
