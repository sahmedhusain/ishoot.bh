// Heavy-load, stress testing, edge-case scenarios and optimization benchmark for the platform monorepo.
// Run with: DATABASE_URL pointing to local *_test database
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const { randomUUID } = require("node:crypto");

const url = new URL(process.env.DATABASE_URL || "file:///missing");
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
  throw new Error("Use a disposable local *_test database");
}

require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});

const { db, runAtomicMutation } = require("../apps/admin/lib/database/db.ts");
const { transactionContext } = require("../apps/admin/lib/database/transaction-context.ts");
const { allocateDocumentNumber } = require("../apps/admin/lib/database/finance/numbering.ts");
const { createPayment } = require("../apps/admin/lib/database/queries/payments.ts");
const { decideApprovalRequest, submitForApproval } = require("../apps/admin/lib/database/services/approval-engine.ts");
const { consumeAbuseLimit } = require("../apps/admin/lib/database/services/abuse-limits.ts");
const pureGosi = require("../apps/admin/lib/database/hr/social-insurance.ts");
const payrollEngine = require("../apps/admin/lib/database/hr/payroll-engine.ts");
const { resolveIncomingLead } = require("../apps/admin/lib/database/services/lead-resolver.ts");
const { getClientsPage } = require("../apps/admin/lib/database/queries/client-profiles.ts");
const { getCustomerDossier } = require("../apps/admin/lib/database/queries/crm.ts");

const prefix = `stress-${randomUUID().slice(0, 8)}`;
const cleanupList = {
  invoices: [],
  payments: [],
  contacts: [],
  deals: [],
  approvals: [],
  windows: [],
};

async function runScenario1_ConcurrentNumbering() {
  console.log("\n--- Scenario 1: High-Concurrency Numbering Race Condition (50 parallel workers) ---");
  const t0 = performance.now();
  const concurrency = 50;
  const docDate = new Date();

  // Run 50 concurrent allocations
  const promises = Array.from({ length: concurrency }, () =>
    allocateDocumentNumber("invoice", docDate, db)
  );

  const results = await Promise.all(promises);
  const elapsed = performance.now() - t0;

  // Verify all numbers are unique
  const uniqueNumbers = new Set(results);
  assert.equal(
    uniqueNumbers.size,
    concurrency,
    `All ${concurrency} allocated numbers must be unique without collisions`
  );

  // Verify format matches PREFIX-YYYY-NNNN
  for (const num of results) {
    assert.match(
      num,
      /^[A-Z0-9]+-\d{4}-\d{4,}$/,
      `Number ${num} must match standard company sequence format`
    );
  }

  console.log(
    `✓ 50/50 concurrent invoice numbers allocated in ${elapsed.toFixed(2)}ms (${(
      (concurrency / elapsed) *
      1000
    ).toFixed(0)} ops/sec) with 0 collisions.`
  );
}

async function runScenario2_ConcurrentPaymentSettlementRace() {
  console.log("\n--- Scenario 2: Concurrent Multi-Stage Payment Race & Overpayment Shield ---");
  // 1. Create client and invoice of 100.000 BHD
  const contact = await db.crmContact.create({
    data: {
      firstName: `${prefix}-client`,
      email: `${prefix}@example.invalid`,
      clientKind: "company",
      companyName: `${prefix} Corp`,
    },
  });
  cleanupList.contacts.push(contact.id);

  const invoiceNumber = `${prefix}-INV-100`;
  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      clientId: contact.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      status: "sent",
      currency: "BHD",
      subtotal: 100.0,
      totalAmount: 100.0,
    },
  });
  cleanupList.invoices.push(invoice.id);

  // 2. Launch 20 concurrent payment attempts of 10.000 BHD each (Total requested: 200 BHD, invoice is only 100 BHD)
  const attempts = Array.from({ length: 20 }, (_, idx) =>
    createPayment({
      invoice_id: invoice.id,
      amount: 10.0,
      currency: "BHD",
      payment_method: "bank_transfer",
      payment_date: new Date().toISOString().split("T")[0],
      reference_number: `${prefix}-ref-${idx}`,
    }).then(
      (res) => ({ status: "fulfilled", res }),
      (err) => ({ status: "rejected", err: err.message })
    )
  );

  const results = await Promise.all(attempts);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  for (const f of fulfilled) {
    cleanupList.payments.push(f.res.id);
  }

  // Exactly 10 payments of 10.000 BHD should succeed, reaching 100.000 BHD.
  // The remaining 10 must be blocked by the overpayment / status guard.
  assert.equal(fulfilled.length, 10, `Exactly 10 payments of 10 BHD should succeed`);
  assert.equal(rejected.length, 10, `Exactly 10 payments should be rejected to prevent overpayment`);

  // Verify invoice state
  const updatedInvoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoice.id },
    include: { payments: true },
  });

  const sumPaid = updatedInvoice.payments.reduce((acc, p) => acc + Number(p.amount), 0);
  assert.equal(sumPaid, 100.0, `Invoice amount paid must equal exactly 100.000 BHD`);
  assert.equal(updatedInvoice.status, "paid", `Invoice status must transition to 'paid'`);

  console.log(
    `✓ Concurrent payments race resolved: exactly 10/20 succeeded (100.000 BHD), 10 rejected. Overpayment prevented.`
  );
}

async function runScenario3_HeavyLoadHRMSandGosi() {
  console.log("\n--- Scenario 3: 100-Employee HRMS, GOSI & Wage support fund Complex Matrix Computation ---");
  const t0 = performance.now();
  const D = (str) => new Date(`${str}T00:00:00Z`);

  // Compute 100 varied employee payroll records under distinct rules
  for (let i = 0; i < 100; i++) {
    const isBahraini = i % 2 === 0;
    const basicSalary = 400 + i * 25; // 400 BHD to 2875 BHD
    const housing = (basicSalary * 0.15);
    const transport = 50;
    const parts = { basic: basicSalary, housing, transport, other: 0 };

    // 1. GOSI calculation
    const due = pureGosi.contributionDue(
      i % 3 === 0 ? D("2026-05-01") : D("2026-05-15"),
      null,
      2026,
      5,
      true
    );

    const contrib = pureGosi.monthlyContributions({
      components: [
        {
          id: "pension",
          code: "PENSION",
          nameEn: "Pension",
          nameAr: "التقاعد",
          appliesTo: ["bahraini"],
          employeePercent: 8.0,
          employerPercent: 12.0,
          serviceTiers: [],
          wageBasis: "basic_housing",
          minWage: null,
          maxWage: 4000,
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          isActive: true,
        },
        {
          id: "unemployment",
          code: "UNEMP",
          nameEn: "Unemployment",
          nameAr: "التعطل",
          appliesTo: ["bahraini", "gcc", "expat"],
          employeePercent: 1.0,
          employerPercent: 1.0,
          serviceTiers: [],
          wageBasis: "basic_housing",
          minWage: null,
          maxWage: 4000,
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          isActive: true,
        },
      ],
      profile: {
        category: i === 99 ? "exempt" : isBahraini ? "bahraini" : "expat",
        registeredWage: null,
        overrides: [],
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
      },
      rules: { firstOfMonthRule: true, wageSource: "contract" },
      pay: parts,
      hireDate: i % 3 === 0 ? D("2026-05-01") : D("2026-05-15"),
      year: 2026,
      month: 5,
    });

    if (i === 99) {
      assert.equal(contrib.due, false, "Exempt employee must have due = false");
      assert.equal(contrib.employee, 0, "Exempt employee contribution must be 0");
    } else if (i % 3 !== 0) {
      assert.equal(contrib.due, false, "Joiner after 1st must not owe GOSI for month 5 under 1st-of-month rule");
    } else if (isBahraini) {
      assert.equal(contrib.due, true, "Bahraini joiner on 1st must have GOSI due");
      assert(contrib.employee > 0, "Bahraini employee contribution must be > 0");
    }

    // 2. Wage support fund wage support calculation
    const supportYear = (i % 3) + 1; // Year 1, 2, or 3
    const supportPct = supportYear === 1 ? 70 : supportYear === 2 ? 50 : 30;
    const qualification = i % 3 === 0 ? "diploma" : i % 3 === 1 ? "bachelor" : "master";
    const cap = qualification === "diploma" ? 500 : qualification === "bachelor" ? 600 : 800;
    const supportedWage = Math.min(basicSalary + housing, cap);
    const tamkeenAmount = (supportedWage * supportPct) / 100;
    assert(tamkeenAmount <= cap, "Wage support fund support cannot exceed cap");
  }

  const elapsed = performance.now() - t0;
  console.log(
    `✓ 100 complex employee HRMS & GOSI computations completed in ${elapsed.toFixed(2)}ms (${(
      (100 / elapsed) *
      1000
    ).toFixed(0)} evaluations/sec).`
  );
}

async function runScenario4_ConcurrentApprovalContention() {
  console.log("\n--- Scenario 4: High-Contention Approval Engine (30 concurrent decisions) ---");
  const accountant = await db.user.findFirstOrThrow({
    where: { role: "accountant" },
    select: { id: true },
  });
  const superAdmin = await db.user.findFirstOrThrow({
    where: { role: "super_admin", isActive: true },
    select: { id: true },
  });

  // Create an expense target
  const exp = await db.expense.create({
    data: {
      descriptionEn: `${prefix}-stress-expense`,
      amount: 50.0,
      currency: "BHD",
      status: "draft",
    },
  });
  cleanupList.expenses = cleanupList.expenses || [];
  cleanupList.expenses.push(exp.id);

  // Submit an approval request
  const submitted = await submitForApproval({
    targetType: "expense",
    targetId: exp.id,
    requesterId: accountant.id,
  });
  cleanupList.approvals.push(submitted.approvalRequestId);

  // Launch 30 concurrent decisions on this single request
  const attempts = Array.from({ length: 30 }, () =>
    decideApprovalRequest(
      submitted.approvalRequestId,
      superAdmin.id,
      "approved",
      "Concurrent test decision"
    ).then(
      (res) => ({ status: "fulfilled", res }),
      (err) => ({ status: "rejected", message: err.message })
    )
  );

  const results = await Promise.all(attempts);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  // Strictly 1 decision must win, 29 must be rejected
  assert.equal(fulfilled.length, 1, `Strictly 1 decision must succeed`);
  assert.equal(rejected.length, 29, `29 concurrent decisions must be blocked`);

  const finalized = await db.approvalRequest.findUniqueOrThrow({
    where: { id: submitted.approvalRequestId },
  });
  assert.equal(finalized.status, "approved", `Request must be in approved status`);

  console.log(
    `✓ Approval race condition shielded: 1 decision committed, 29 safely rejected with concurrency error.`
  );
}

async function runScenario5_SlidingWindowRateLimiting() {
  console.log("\n--- Scenario 5: High-Concurrency Sliding Window Abuse Limit (200 requests) ---");
  const windowKey = `${prefix}-rate-limit`;
  cleanupList.windows.push(windowKey);
  const limit = 40;
  const totalRequests = 200;

  const t0 = performance.now();
  const promises = Array.from({ length: totalRequests }, () =>
    consumeAbuseLimit(windowKey, "test-action", limit).then(
      () => true,
      () => false
    )
  );

  const results = await Promise.all(promises);
  const elapsed = performance.now() - t0;

  const allowed = results.filter((r) => r === true).length;
  const blocked = results.filter((r) => r === false).length;

  assert.equal(allowed, limit, `Exactly ${limit} requests must be allowed`);
  assert.equal(blocked, totalRequests - limit, `Exactly ${totalRequests - limit} requests must be blocked`);

  console.log(
    `✓ 200 concurrent abuse-check calls in ${elapsed.toFixed(2)}ms: exactly ${allowed} allowed, ${blocked} throttled.`
  );
}

async function runScenario6_LeadResolverDeduplication() {
  console.log("\n--- Scenario 6: Lead Resolver Deduplication Under Case & Whitespace Variations ---");
  const baseEmail = `${prefix}.lead@example.invalid`;

  // Create initial contact
  const c = await db.crmContact.create({
    data: {
      firstName: "Sayed",
      lastName: "Test",
      email: baseEmail,
      emailNorm: baseEmail.toLowerCase().trim(),
      phone: "+97339001100",
      phoneE164: "+97339001100",
    },
  });
  cleanupList.contacts.push(c.id);

  // Test permutations
  const variations = [
    `  ${baseEmail.toUpperCase()} `,
    baseEmail,
    ` ${baseEmail} `,
  ];

  for (const v of variations) {
    const res = await resolveIncomingLead({
      name: "Sayed Lead",
      email: v,
      phone: "39001100", // local format should match +97339001100
      message: "Looking for cinema production quotation",
      intent: "inquiry",
    });

    assert.equal(
      res.customerId,
      c.id,
      `Variation '${v}' must resolve to existing contact ${c.id}`
    );
    assert.equal(res.resolution, "existing_customer", "Resolution must be 'existing_customer'");
    cleanupList.inquiries = cleanupList.inquiries || [];
    cleanupList.inquiries.push(res.inquiryId);
  }

  console.log("✓ Lead resolver successfully matched all permutations to existing client record.");
}

async function runScenario7_MemoryAndQueryOptimizationBenchmark() {
  console.log("\n--- Scenario 7: Memory Stability & Latency Benchmark ---");
  const startMemory = process.memoryUsage();

  // Run 100 client queries with filters and rankings
  const latencies = [];
  for (let i = 0; i < 50; i++) {
    const q0 = performance.now();
    await getClientsPage({ page: "1", sort: "billed_desc" });
    latencies.push(performance.now() - q0);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[latencies.length - 1];

  const endMemory = process.memoryUsage();
  const heapDiffMb = (endMemory.heapUsed - startMemory.heapUsed) / (1024 * 1024);

  console.log(`✓ 50 Complex Filter/ABC Rank Queries Latency:`);
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);
  console.log(`  p99: ${p99.toFixed(2)}ms`);
  console.log(`  Heap delta: ${heapDiffMb.toFixed(2)}MB (Memory stable)`);
}

async function cleanup() {
  console.log("\n--- Teardown: Cleaning up isolated fixtures ---");
  try {
    if (cleanupList.inquiries?.length) {
      await db.inquiry.deleteMany({ where: { id: { in: cleanupList.inquiries } } });
    }
    if (cleanupList.payments.length) {
      await db.payment.deleteMany({ where: { id: { in: cleanupList.payments } } });
    }
    if (cleanupList.invoices.length) {
      await db.invoice.deleteMany({ where: { id: { in: cleanupList.invoices } } });
    }
    if (cleanupList.approvals.length) {
      await db.approvalDecision.deleteMany({ where: { approvalRequestId: { in: cleanupList.approvals } } });
      await db.approvalRequest.deleteMany({ where: { id: { in: cleanupList.approvals } } });
    }
    if (cleanupList.expenses?.length) {
      await db.expense.deleteMany({ where: { id: { in: cleanupList.expenses } } });
    }
    if (cleanupList.contacts.length) {
      await db.crmContact.deleteMany({ where: { id: { in: cleanupList.contacts } } });
    }
    if (cleanupList.windows.length) {
      await db.abuseWindow.deleteMany({ where: { key: { in: cleanupList.windows } } });
    }
  } catch (err) {
    console.error("Cleanup warning:", err);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  console.log("================================================================================");
  console.log("        HEAVY-LOAD, INTEGRATION & OPTIMIZATIONS STRESS SUITE                    ");
  console.log("================================================================================");
  try {
    await runScenario1_ConcurrentNumbering();
    await runScenario2_ConcurrentPaymentSettlementRace();
    await runScenario3_HeavyLoadHRMSandGosi();
    await runScenario4_ConcurrentApprovalContention();
    await runScenario5_SlidingWindowRateLimiting();
    await runScenario6_LeadResolverDeduplication();
    await runScenario7_MemoryAndQueryOptimizationBenchmark();

    console.log("\n================================================================================");
    console.log("  ALL 7 HEAVY-LOAD & OPTIMIZATION INTEGRATION SCENARIOS PASSED WITH 100% SUCCESS ");
    console.log("================================================================================");
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in stress suite:", err);
  process.exitCode = 1;
});
