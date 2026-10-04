require("ts-node").register({transpileOnly:true,skipProject:true,compilerOptions:{module:"CommonJS",target:"ES2022",moduleResolution:"Node",esModuleInterop:true,resolveJsonModule:true}});
// Run: node scripts/check-platform.cjs
// Exercise source modules with boundary mocks; no production database writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks) {
  if (mocks["@ishoot/database"]) { mocks["@ishoot/database"].runAtomicMutation ??= async (fn) => fn(); mocks["@ishoot/database"].memoizeOperation ??= async(_key,fn)=>fn(); mocks["@ishoot/database"].requireFeatureEnabled ??= async()=>{}; mocks["@ishoot/database"].measureOperation ??= async (_name, fn) => fn(); if (mocks["@ishoot/database"].db) mocks["@ishoot/database"].db.$queryRaw ??= async () => []; }
  mocks["../../lib/action-input"] ??= require("../apps/admin/lib/action-input.ts");
  mocks["../../../lib/upload-input"] ??= require("../apps/admin/lib/upload-input.ts");
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
      if (!(id in mocks)) throw new Error(`Unmocked dependency: ${id}`);
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

  const types = load("packages/database/src/types.ts", {});
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
                "stored VAT rate must survive edit",
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
  const invoices = load("packages/database/src/queries/invoices.ts", {
    "../db": { db },
    "../initial-company-config.json": { company: {} },
    "../types": types,
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
  });
  await assert.rejects(
    payments.createPayment({ invoice_id: "i", amount: -1 }),
    /positive/,
  );
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
  const upload = load("apps/admin/app/api/upload/route.ts", {
    "next/server": { NextResponse: response },
    "fs/promises": {},
    path: require("node:path"),
    crypto: require("node:crypto"),
    "../../../lib/auth": { getCurrentUser: async () => null },
    "../../../lib/attachment-access": {},
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
  assert.equal(totals.revenue, 55);
  assert.equal(totals.expenses, 20);
  assert.equal(totals.overdue, 55);
  assert.equal(totals.vatCollected, 5);
  await assert.rejects(financial.getMonthlyCashflow(0), /Month count/);
  const invoiceMetrics = await financial.getInvoiceSummary();
  assert.deepEqual(Object.keys(invoiceMetrics).sort(), ["discountsGiven", "outstanding", "overdue"]);
  assert.equal(invoiceMetrics.outstanding, 55);
  assert.equal(invoiceMetrics.overdue, 55);
  console.log(
    "Platform checks passed: revocation, permissions, invoice rollback/VAT, payment validation, lead conversion/idempotency.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
