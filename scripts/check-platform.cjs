require("ts-node").register({transpileOnly:true,skipProject:true,compilerOptions:{module:"CommonJS",target:"ES2022",moduleResolution:"Node",esModuleInterop:true,resolveJsonModule:true}});
const { realConstants } = require("./lib/real-constants.cjs");
// Run: node scripts/check-platform.cjs
// Exercise source modules with boundary mocks; no production database writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks) {
  if (mocks["@ishoot/database"]) { mocks["@ishoot/database"].runAtomicMutation ??= async (fn) => fn(); mocks["@ishoot/database"].memoizeOperation ??= async(_key,fn)=>fn(); mocks["@ishoot/database"].requireFeatureEnabled ??= async()=>{}; mocks["@ishoot/database"].measureOperation ??= async (_name, fn) => fn(); if (mocks["@ishoot/database"].db) mocks["@ishoot/database"].db.$queryRaw ??= async () => []; }
  mocks["../../lib/action-input"] ??= require("../apps/admin/lib/action-input.ts");
  mocks["../services/uploads"] ??= { claimUpload: async () => ({fileSize: 1, mimeType: "application/pdf"}) };
  if (mocks["../db"]?.db) mocks["../db"].db.featureToggle ??= { findUnique: async () => null, findMany: async () => [] };

  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) => {
      id = ((i,m)=>i in m?i:(i.startsWith('@ishoot/database/')&&'@ishoot/database' in m?'@ishoot/database':i))(id, mocks);
      if (!(id in mocks)) { const real = realConstants(file, id); if (real) return real; throw new Error(`Unmocked dependency: ${id}`); }
      return mocks[id];
    },
    console: { error() {}, warn() {} },
    Date,
    Set,
    Buffer,
    Error,
    process,
    crypto: require("node:crypto").webcrypto,
  });
  return module.exports;
}
async function main() {
  let session = null;
  const user = { id: "u", role: "viewer", is_active: true };
  const auth = load("apps/admin/lib/auth.ts", {
    react: { cache: (fn) => fn },
    "next/headers": {
      cookies: async () => ({ get: () => ({ value: "token" }) }),
    },
    "next/navigation": {
      redirect: () => {
        throw new Error("redirect");
      },
    },
    "./jwt": {
      verifySessionToken: async () => ({ userId: "u" }),
      SESSION_COOKIE_NAME: "cookie",
    },
    "@ishoot/database": {
      getSessionByToken: async () => session,
      hasPermission: async () => false,
      getEffectivePermissions:async()=>({}),
    },
  });
  assert.equal(await auth.getCurrentUser(), null, "revoked JWT must fail");
  session = { user_id: "u", user };
  assert.equal((await auth.getCurrentUser()).id, "u");
  await assert.rejects(
    auth.requirePermission("invoices", "read"),
    /Unauthorized/,
  );

  // Super Admin must survive stale denials, user overrides and disabled module rows.
  let storedGrant;
  const permissionsApi = load("packages/database/src/queries/permissions.ts", {
    "../db": { db: {
      featureToggle: { findUnique: async () => ({ isEnabled: false }), findMany: async () => [{ moduleKey: "invoicing", isEnabled: false }] },
      permission: { findMany: async () => [{ resource: "users", action: "write", allowed: false }], findUnique: async () => ({ allowed: false }), upsert: async (args) => { storedGrant = args; } },
    } },
  });
  const overrides = Object.fromEntries(permissionsApi.ALL_RESOURCES.flatMap((resource) =>
    permissionsApi.ALL_ACTIONS.map((action) => [resource + ":" + action, false])));
  const effective = await permissionsApi.getEffectivePermissions("super_admin", overrides);
  assert.equal(Object.keys(effective).length, permissionsApi.ALL_RESOURCES.length * permissionsApi.ALL_ACTIONS.length);
  for (const resource of permissionsApi.ALL_RESOURCES) {
    for (const action of permissionsApi.ALL_ACTIONS) {
      assert.equal(effective[resource + ":" + action], true);
      assert.equal(await permissionsApi.hasPermission("super_admin", resource, action, overrides), true);
      assert.equal(permissionsApi.DEFAULT_ROLE_RULES.super_admin[resource].includes(action), true);
    }
  }
  assert.equal(await permissionsApi.hasPermission("viewer", "invoices", "write"), false);
  assert.equal((await permissionsApi.getEffectivePermissions("viewer", overrides))["users:write"], false);

  assert.equal(await permissionsApi.setPermission("super_admin", "users", "write", false), true);
  assert.equal(storedGrant.update.allowed, true);
  assert.equal(storedGrant.create.allowed, true);
  assert.equal(await permissionsApi.setPermission("viewer", "users", "write", false), true);
  assert.equal(storedGrant.update.allowed, false);

  let roleActor = { id: "root", role: "super_admin" };
  let savedGrants = [];
  let roleWrites = 0;
  const roleActions = load("apps/admin/app/actions/roles.ts", {
    "../../lib/auth": { requirePermission: async () => roleActor },
    "next/cache": { revalidatePath() {} },
    "@ishoot/database": {
      ALL_RESOURCES: permissionsApi.ALL_RESOURCES, ALL_ACTIONS: permissionsApi.ALL_ACTIONS,
      db: { $transaction: async (fn) => fn({
        role: { update: async ({ where }) => { roleWrites++; return { id: where.id }; } },
        permission: { findMany: async () => [], upsert: async (args) => { savedGrants.push({ ...args.create }); } },
        activityLog: { create: async () => {} },
      }) },
    },
  });
  const denyAll = Object.fromEntries(permissionsApi.ALL_RESOURCES.flatMap((resource) =>
    permissionsApi.ALL_ACTIONS.filter((action) => action !== "write").map((action) => [resource + ":" + action, false])));
  const rolePayload = { id: "super_admin", nameEn: "Super Administrator", nameAr: "مسؤول النظام", grants: denyAll };
  await roleActions.upsertRoleAction(rolePayload);
  assert.equal(savedGrants.length, Object.keys(effective).length);
  assert.equal(savedGrants.every((grant) => grant.allowed), true, "submitted denials must never restrict Super Admin");
  savedGrants = [];
  await roleActions.upsertRoleAction({ ...rolePayload, id: "viewer" });
  assert.equal(savedGrants.length > 0 && savedGrants.every((grant) => !grant.allowed), true, "ordinary role denials must remain effective");
  roleActor = { id: "admin", role: "admin" };
  await assert.rejects(roleActions.upsertRoleAction(rolePayload), /Only super administrators/);
  assert.equal(roleWrites, 2, "ordinary administrators cannot modify role grants");

  let mutation = false;
  const settings = load("apps/admin/app/actions/settings.ts", {
    "@ishoot/database": {
      createSocialLink: () => {
        mutation = true;
      },
    },
    "next/cache": { revalidatePath() {} },
    "../../lib/auth": {
      requirePermission: async () => {
        throw new Error("denied");
      },
    },
  });
  await assert.rejects(settings.createSocialLinkAction({ platform: "website", url: "https://example.invalid" }), /denied/);
  await assert.rejects(settings.toggleFeatureAction("crm", false), /denied/);
  assert.equal(mutation, false);

  const types = load("packages/database/src/types.ts", { "@ishoot/config/currency": require("../packages/config/src/constants/currency.cjs") });
  let deleted = false,
    usedTransaction = false;
  const invoice = {
    id: "i",
    status: "draft",
    currency: "BHD",
    vatEnabled: true,
    vatPercentage: 5,
    vatAmount: 5,
    discountType: "none",
    discountValue: 0,
    lineItems: [],
    payments: [],
  };
  const db = {
    invoice: { findUnique: async () => invoice },
    $transaction: async (fn) => {
      usedTransaction = true;
      try {
        return await fn({
          $queryRaw: async () => [],
          invoiceLineItem: {
            deleteMany: async () => {
              deleted = true;
            },
          },
          invoice: {
            findUnique: async () => invoice,
            update: async (args) => {
              assert.equal(
                args.data.vatAmount,
                5,
                "draft VAT follows the company rate",
              );
              throw new Error("simulated update failure");
            },
          },
        });
      } catch (e) {
        deleted = false;
        throw e;
      }
    },
  };
  const numbering = { allocateDocumentNumber: async (kind) => (kind === "invoice" ? "INV-2026-0001" : "RCT-2026-0001") };
  const invoices = load("packages/database/src/queries/invoices.ts", {
    "../db": { db },
    "../finance/numbering": numbering,
    "../initial-company-config.json": { company: {} },
    "../types": types,
    "./crm": { advanceDealForEvent: async () => false },
    // Drafts take the company VAT (5% here); issued invoices keep their own snapshot.
    "../finance/vat": { companyVat: async () => ({ vatEnabled: true, vatPercentage: 5 }) },
    "./sales-attribution": { resolveSalesOwner: async (requested, issuer) => requested || issuer || null },
  });
  await assert.rejects(invoices.updateInvoice("i", { line_items: [{ quantity: 1, unit_price: 100, description_en: "Shoot" }] }), /simulated update failure/);
  assert.equal(usedTransaction, true);
  assert.equal(deleted, false, "rollback must preserve items");

  let current = {
    id: "i",
    status: "void",
    currency: "USD",
    totalAmount: 100,
    payments: [],
  };
  const payments = load("packages/database/src/queries/payments.ts", {
    "../db": {
      db: {
        $transaction: async (fn) =>
          fn({
            $queryRaw: async () => [],
            invoice: { findUnique: async () => current },
          }),
      },
    },
    "../types": types,
    "../initial-company-config.json": { company: {} },
    "../finance/numbering": numbering,
    "./crm": { advanceDealForEvent: async () => false },
  });
  await assert.rejects(
    payments.createPayment({ invoice_id: "i", amount: -1 }),
    /positive/,
  );
  current.status = "draft";
  await assert.rejects(payments.createPayment({ invoice_id: "i", amount: 1 }), /Mark the invoice as sent/, "drafts are not receivables");
  current.status = "void";
  await assert.rejects(
    payments.createPayment({ invoice_id: "i", amount: 1 }),
    /not payable/,
  );
  current.status = "sent";
  await assert.rejects(
    payments.createPayment({ invoice_id: "i", amount: 1, currency: "BHD" }),
    /currency/,
  );
  await assert.rejects(
    payments.createPayment({ invoice_id: "i", amount: 101 }),
    /balance/,
  );

  // Money is settled in minor units: 0.7 + 0.1 pays an invoice of 0.8 in full.
  const money = require("./lib/real-constants.cjs").realConstants("packages/database/src/queries/x.ts", "../finance/money");
  assert.equal(money.isFullyPaid(0.8, 0.7 + 0.1, "BHD"), true);
  assert.equal(money.amountDue(0.8, 0.7 + 0.1, "BHD"), 0);
  assert.equal(money.paymentStatusFor(10, 3.3335, "BHD"), "partially_paid");
  assert.equal(money.lineTotal(3, 0.3333, "BHD"), 1);
  assert.equal(money.roundMoney(1.0005, "KWD"), 1.001);
  assert.equal(money.roundMoney(1.005, "JPY"), 1);

  let dealCount = 0,
    conversion = null,
    locked = false;
  const inquiry = {
    intent: "inquiry",
    id: "q",
    customerId: "c",
    mergeFlag: false,
    name: "Client",
    email: "c@example.com",
    budgetRange: "5,000 - 10,000",
    message: "Shoot",
  };
  const tx = {
    $queryRaw: async () => {
      locked = true;
    },
    inquiry: { findUnique: async () => inquiry, update: async () => {} },
    crmContact: { findUnique: async () => ({ id: "c" }) },
    crmDeal: {
      findUnique: async () => conversion ? { id: "d", contactId: "c" } : null,
      create: async (args) => {
        assert.equal(args.data.dealValue, 5000);
        dealCount++;
        return { id: "d" };
      },
    },
    activityLog: {
      findFirst: async () => conversion,
      create: async (args) => {
        conversion = args.data;
      },
    },
  };
  const crm = load("apps/admin/app/actions/crm.ts", {
    "../../lib/inquiry-access": { requireInquiryAccess: async () => user },
    "@ishoot/database": { db: { $transaction: async (fn) => fn(tx) } },
    "next/cache": { revalidatePath() {} },
    "../../lib/auth": { requirePermission: async () => user },
  });
  assert.equal((await crm.convertInquiryToClientAction("q")).dealId, "d");
  assert.equal((await crm.convertInquiryToClientAction("q")).dealId, "d");
  assert.equal(dealCount, 1);
  assert.equal(locked, true);
  inquiry.mergeFlag = true;
  await assert.rejects(crm.convertInquiryToClientAction("q"), /conflict/);
  const response = {
    json: (body, options) => ({ body, status: options?.status || 200 }),
  };
  const upload = load("apps/admin/app/api/upload/init/route.ts", {
    "next/server": { NextResponse: response },
    "fs/promises": {},
    path: require("node:path"),
    crypto: require("node:crypto"),
    "../../../../lib/auth": { getCurrentUser: async () => null },
    "../../../../lib/attachment-access": {},
    "@ishoot/database": {},
    "@ishoot/locales": { getTranslations: () => ({ api: { upload: {} } }) },
    "next/cache": {},
  });
  assert.equal(
    (
      await upload.POST({
        formData: () => {
          throw new Error("must reject before parsing");
        },
      })
    ).status,
    401,
  );
  const inquiryRoute = load("apps/web/app/api/inquiry/route.ts", {
    "node:crypto": require("node:crypto"),
    "../../../lib/submissions": {
      readSubmission: async () => {
        throw new Error("INVALID_INPUT");
      },
    },
    "next/server": { NextResponse: response },
    "@ishoot/database": {},
    "@ishoot/email": {},
    "@ishoot/locales": {
      getTranslations: () => ({
        api: {
          inquiry: { requiredFields: "Invalid input", serverError: "Failed" },
        },
      }),
    },
  });
  assert.equal(
    (
      await inquiryRoute.POST({
        json: async () => ({
          fullName: {},
          email: "bad",
          message: [],
          services: "oops",
        }),
      })
    ).status,
    400,
  );
  assert.throws(
    () =>
      types.calculateInvoiceTotals(
        [{ quantity: -1, unit_price: 10 }],
        "none",
        0,
        false,
        10,
      ),
    /line items/,
  );
  const financial = load("packages/database/src/queries/finance.ts", {
    // Dashboard profit uses the financial report's definition (net of VAT, payroll and fees included).
    "./finance-reports": {
      getFinancialSummaryReport: async () => ({
        cashNetReceipts: 50, expensesNet: 15, inputVatNonRecoverable: 1, payrollCostsTotal: 3, bankFeesTotal: 1, operatingProfit: 30,
      }),
    },
    "../db": {
      db: {
        $queryRaw: async () => [
          {
            revenue: "55",
            expenses: "20",
            outstanding: "55",
            overdue: "55",
            discountsGiven: "0",
            vatCollected: "5",
          },
        ],
      },
    },
  });
  const totals = await financial.getFinancialSummary();
  assert.equal(totals.revenue, 50, "revenue is net of VAT");
  assert.equal(totals.expenses, 20, "operating costs include payroll and fees");
  assert.equal(totals.netProfit, 30, "dashboard profit equals the report's operating profit");
  assert.equal(totals.overdue, 55);
  assert.equal(totals.vatCollected, 5);
  await assert.rejects(financial.getMonthlyCashflow(0), /Month count/);
  const invoiceMetrics = await financial.getInvoiceSummary();
  assert.deepEqual(Object.keys(invoiceMetrics).sort(), ["discountsGiven", "outstanding", "overdue"]);
  assert.equal(invoiceMetrics.outstanding, 55);
  assert.equal(invoiceMetrics.overdue, 55);
  console.log(
    "Platform checks passed: revocation, Super Admin invariants, role-save authorization, permissions, invoice rollback/VAT, payment validation, lead conversion/idempotency.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
