// Run with DATABASE_URL pointing to a disposable local database ending in _test.
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const { execFileSync } = require("node:child_process");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");
const url = new URL(process.env.DATABASE_URL || "file:///missing");
if (
  !url.pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1"].includes(url.hostname)
)
  throw new Error("Use a disposable local *_test database");
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
const finance = require("../packages/database/src/queries/finance.ts");
const permissions = require("../packages/database/src/queries/permissions.ts");
const {
  getCompanySettings,
} = require("../packages/database/src/queries/company-settings.ts");
const prefix = `audit-${randomUUID()}`;
let sourceBytes = 0,
  reads = 0;
const queries = new Set();
db.$use(async (params, next) => {
  if (["findMany", "queryRaw"].includes(params.action)) reads++;
  if (params.action === "queryRaw") {
    const raw = params.args[0];
    const sql =
      raw?.sql ||
      raw?.text ||
      (Array.isArray(raw)
        ? raw
            .map((s, i) => s + (i < raw.length - 1 ? "$" + (i + 1) : ""))
            .join("")
        : typeof raw === "string"
          ? raw
          : null);
    if (sql && !sql.startsWith("EXPLAIN")) queries.add(sql);
  }
  return next(params);
});
const boundary = {};
for (const [module, func] of [
  ["invoices", "getAllInvoices"],
  ["payments", "getAllPayments"],
  ["expenses", "getAllExpenses"],
]) {
  const original = require(`../packages/database/src/queries/${module}.ts`)[
    func
  ];
  boundary[`./${module}`] = {
    [func]: async () => {
      const records = await original();
      sourceBytes += Buffer.byteLength(JSON.stringify(records));
      return records;
    },
  };
}
const legacyModule = { exports: {} };
const legacyCode = ts.transpileModule(
  execFileSync(
    "git",
    [
      "show",
      "447326d282b186d7adc12cf7f0bfea5ed6e96c7c:packages/database/src/queries/finance.ts",
    ],
    { encoding: "utf8" },
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
vm.runInNewContext(legacyCode, {
  module: legacyModule,
  exports: legacyModule.exports,
  require: (id) => boundary[id] || {},
  Date,
  console,
});
async function main() {
  const { ALL_ROLES } = require("../packages/database/src/queries/permissions.ts");
  await db.role.createMany({ data: [...ALL_ROLES, prefix].map(id => ({id,nameEn:id,nameAr:id,isSystem:true})), skipDuplicates:true });
  // Compare against the previous algorithm using real Decimal/date/relation records.
  const invoices = [
    {
      id: `${prefix}-partial`,
      invoiceNumber: `${prefix}-partial`,
      dueDate: new Date("2000-01-01"),
      totalAmount: 110,
      vatAmount: 10,
      vatEnabled: true,
      status: "partially_paid",
      currency: "BHD",
      discountAmount: 5,
    },
    {
      id: `${prefix}-usd`,
      invoiceNumber: `${prefix}-usd`,
      dueDate: new Date("2000-01-01"),
      totalAmount: 900,
      status: "sent",
      currency: "USD",
    },
    {
      id: `${prefix}-void`,
      invoiceNumber: `${prefix}-void`,
      dueDate: new Date("2000-01-01"),
      totalAmount: 100,
      status: "void",
      currency: "BHD",
    },
    {
      id: `${prefix}-draft`,
      invoiceNumber: `${prefix}-draft`,
      dueDate: new Date("2000-01-01"),
      totalAmount: 20,
      status: "draft",
      currency: "BHD",
    },
  ];
  await db.invoice.createMany({ data: invoices });
  // en-CA locale output is YYYY-MM; use explicit formatToParts below for portability.
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Bahrain",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const currentMonth = `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
  const paymentDate = new Date(`${currentMonth}-01T00:00:00Z`);
  await db.payment.createMany({
    data: [
      {
        invoiceId: invoices[0].id,
        receiptNumber: `${prefix}-p`,
        amount: 55,
        currency: "BHD",
        paymentDate,
      },
      {
        invoiceId: invoices[1].id,
        receiptNumber: `${prefix}-u`,
        amount: 900,
        currency: "USD",
        paymentDate,
      },
      {
        invoiceId: invoices[2].id,
        receiptNumber: `${prefix}-v`,
        amount: 50,
        currency: "BHD",
        paymentDate,
      },
    ],
  });
  await db.expense.createMany({
    data: [
      {
        descriptionEn: prefix,
        amount: 20,
        currency: "BHD",
        expenseDate: paymentDate,
      },
      {
        descriptionEn: prefix,
        amount: 800,
        currency: "USD",
        expenseDate: paymentDate,
      },
    ],
  });
  const old = await legacyModule.exports.getFinancialSummary();
  const current = await finance.getFinancialSummary();
  for (const key of Object.keys(current)) {
    if (typeof current[key] === "number")
      assert.ok(
        Math.abs(current[key] - old[key]) < 1e-8,
        `${key}: new=${current[key]} previous=${old[key]}`,
      );
    else assert.equal(current[key], old[key]);
  }
  assert.equal(current.vatCollected, 5);
  assert.equal(current.outstanding, 55);
  const cashflow = await finance.getMonthlyCashflow(6);
  assert.equal(cashflow.length, 6);
  assert.deepEqual(cashflow.at(-1), {
    monthKey: currentMonth,
    revenue: 55,
    expenses: 20,
  });
  assert.equal(cashflow[0].revenue, 0);
  assert.deepEqual(await finance.getExpenseCategoryTotals(), { other: 20 });
  await assert.rejects(finance.getMonthlyCashflow(121), /Month count/);
  await assert.rejects(getCompanySettings(), /settings are missing/);
  assert.equal(
    await permissions.hasPermission("admin", "invoices", "read"),
    false,
    "absent DB permission must deny",
  );
  await db.permission.createMany({
    data: [
      { role: prefix, resource: "deals", action: "read", allowed: true },
      { role: prefix, resource: "deals", action: "write", allowed: false },
    ],
  });
  const matrix = await permissions.getEffectivePermissions(prefix, {
    "deals:read": false,
    "contacts:read": true,
  });
  assert.equal(matrix["deals:read"], false);
  assert.equal(matrix["deals:write"], false);
  assert.equal(matrix["contacts:read"], true);
  assert.equal(matrix["users:write"], false);
  const {
    createMinuteOfMeeting,
    approveAndSignMom,
  } = require("../packages/database/src/queries/moms.ts");
  const momInput = {
    title: prefix,
    meetingDate: "2026-10-04",
    agenda: "Audit",
    attendees: [],
    discussionPoints: [],
    actionItems: [],
  };
  const meetings = await Promise.all([
    createMinuteOfMeeting(momInput),
    createMinuteOfMeeting(momInput),
  ]);
  assert.notEqual(
    meetings[0].mom_number,
    meetings[1].mom_number,
    "simultaneous meeting numbers must be distinct",
  );
  const { createUser } = require("../packages/database/src/queries/users.ts");
  const signer = await createUser({
    full_name: "Test signer",
    email: `${prefix.toUpperCase()}@EXAMPLE.INVALID`,
    password: "isolated test password",
    role: "super_admin",
  });
  assert.equal(signer.email, `${prefix}@example.invalid`);
  const {
    getSessionByToken,
    createSession,
  } = require("../packages/database/src/queries/sessions.ts");
  await db.user.update({
    where: { id: signer.id },
    data: { signatureUrl: "/configured-signature.png" },
  });
  await createSession({
    userId: signer.id,
    token: prefix,
    expiresAt: new Date(Date.now() + 60000),
  });
  assert.equal(
    (await getSessionByToken(prefix)).user.signature_url,
    "/configured-signature.png",
  );
  assert.equal(
    (
      await approveAndSignMom(
        meetings[0].id,
        signer.id,
        "/configured-signature.png",
      )
    ).status,
    "approved",
  );
  await assert.rejects(approveAndSignMom(meetings[0].id, signer.id, "/forged-signature.png"), /Signed meetings cannot be edited/);
  await db.minuteOfMeeting.deleteMany({ where: { title: prefix } });
  await db.user.delete({ where: { id: signer.id } });
  console.log(
    "PASS: concurrent meeting numbering, sealed signature, normalized user email, session signature DTO.",
  );
  // Representative synthetic data; local timings are diagnostics, not production SLOs.
  const count = 1000;
  await db.invoice.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      id: `${prefix}-bench-${i}`,
      invoiceNumber: `${prefix}-bench-${i}`,
      totalAmount: 110,
      vatAmount: 10,
      vatEnabled: true,
      currency: "BHD",
      status: "partially_paid",
      dueDate: new Date("2000-01-01"),
    })),
  });
  await db.payment.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      invoiceId: `${prefix}-bench-${i}`,
      receiptNumber: `${prefix}-bench-${i}`,
      amount: 55,
      currency: "BHD",
      paymentDate,
    })),
  });
  await db.invoiceLineItem.createMany({
    data: Array.from({ length: count * 2 }, (_, i) => ({
      invoiceId: `${prefix}-bench-${Math.floor(i / 2)}`,
      descriptionEn: "Synthetic production service",
      quantity: 1,
      unitPrice: 50,
      lineTotal: 50,
    })),
  });
  await db.expense.createMany({
    data: Array.from({ length: count }, () => ({
      descriptionEn: prefix,
      amount: 20,
      currency: "BHD",
      expenseDate: paymentDate,
    })),
  });
  const measure = async (fn) => {
    reads = 0;
    sourceBytes = 0;
    const begin = performance.now();
    const result = await fn();
    return {
      ms: Number((performance.now() - begin).toFixed(2)),
      ormReads: reads,
      sourceBytes,
      resultBytes: Buffer.byteLength(JSON.stringify(result)),
    };
  };
  await Promise.all([
    db.$executeRaw`ANALYZE "Invoice"`,
    db.$executeRaw`ANALYZE "Payment"`,
    db.$executeRaw`ANALYZE "Expense"`,
    db.$executeRaw`ANALYZE "InvoiceLineItem"`,
  ]);
  await Promise.all([
    finance.getFinancialSummary(),
    finance.getMonthlyCashflow(6),
  ]);
  for (const query of queries) {
    if (!query.includes("WITH bounds") && !query.includes("WITH paid"))
      continue;
    const plan = await db.$queryRawUnsafe(
      `EXPLAIN (ANALYZE, FORMAT JSON) ${query}`,
      ...(query.includes("$1") ? [6] : []),
    );
    const detail = plan[0]["QUERY PLAN"][0];
    console.log(
      JSON.stringify({
        query: query.includes("WITH bounds") ? "monthly" : "summary",
        planningMs: detail["Planning Time"],
        executionMs: detail["Execution Time"],
        jit: detail.JIT,
      }),
    );
  }
  const previousRuns = [],
    optimizedRuns = [];
  for (let run = 0; run < 5; run++) {
    previousRuns.push(
      await measure(async () =>
        Promise.all([
          legacyModule.exports.getFinancialSummary(),
          legacyModule.exports.getMonthlyCashflow(6),
        ]),
      ),
    );
    optimizedRuns.push(
      await measure(async () =>
        Promise.all([
          finance.getFinancialSummary(),
          finance.getMonthlyCashflow(6),
        ]),
      ),
    );
  }
  const median = (runs) => ({
    ...runs[0],
    ms: runs.map((r) => r.ms).sort((a, b) => a - b)[
      Math.floor(runs.length / 2)
    ],
    samplesMs: runs.map((r) => r.ms),
  });
  const previous = median(previousRuns),
    optimized = median(optimizedRuns);
  console.log(
    JSON.stringify(
      {
        passed:
          "SQL parity, mixed currencies, void/draft exclusions, partial VAT, month bounds/zero filling, category totals, missing settings, DB-backed RBAC",
        fixture: {
          invoices: count + 4,
          payments: count + 3,
          expenses: count + 2,
          lineItems: count * 2,
        },
        previous,
        optimized,
      },
      null,
      2,
    ),
  );
}
main()
  .finally(async () => {
    await db.minuteOfMeeting.deleteMany({ where: { title: prefix } });
    await db.user.deleteMany({ where: { email: `${prefix}@example.invalid` } });
    await db.payment.deleteMany({
      where: { receiptNumber: { startsWith: prefix } },
    });
    await db.invoice.deleteMany({
      where: { invoiceNumber: { startsWith: prefix } },
    });
    await db.expense.deleteMany({ where: { descriptionEn: prefix } });
    await db.permission.deleteMany({ where: { role: prefix } });
    await db.role.deleteMany({ where: { id: prefix } });
    await db.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
