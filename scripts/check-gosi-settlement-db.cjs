// Run: node scripts/check-gosi-settlement-db.cjs  (local database only; everything is rolled back)
// Social insurance as dated components (rate changes take effect from their date, the 1st-of-month rule for joiners
// and leavers, registered wages and per-employee exceptions), wage-support programmes (schedule by year, caps by
// qualification, partial approvals, proration), and final settlements from calculation to payment.
require("dotenv").config({ quiet: true });
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
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const {
  transactionContext,
} = require("../packages/database/src/transaction-context.ts");
const { createEmployee } = require("../packages/database/src/queries/hrms.ts");
const payroll = require("../packages/database/src/queries/payroll.ts");
const settings = require("../packages/database/src/queries/hr-settings.ts");
const gosi = require("../packages/database/src/queries/social-insurance.ts");
const support = require("../packages/database/src/queries/support-programs.ts");
const pure = require("../packages/database/src/hr/social-insurance.ts");
const settlements = require("../packages/database/src/queries/final-settlements.ts");
const {
  decideApprovalRequest,
  findPendingApproval,
} = require("../packages/database/src/services/approval-engine.ts");
const engine = require("../packages/database/src/hr/payroll-engine.ts");

const rollback = new Error("ROLLBACK_GOSI_TEST");
const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(Number(actual) - expected) < 0.0015,
    `${message}: expected ${expected}, got ${actual}`,
  );
const rejects = (promise, message) =>
  assert.rejects(promise, (error) => error.message === message);
const D = (s) => new Date(`${s}T00:00:00Z`);

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname),
    "Run only against a local test/development database",
  );

  // ---- pure rules
  const parts = { basic: 1000, housing: 200, transport: 0, other: 0 };
  assert.equal(
    pure.contributionDue(D("2199-03-01"), null, 2199, 3, true),
    true,
    "joined on the 1st: the month counts",
  );
  assert.equal(
    pure.contributionDue(D("2199-03-02"), null, 2199, 3, true),
    false,
    "joined after the 1st: nothing that month",
  );
  assert.equal(
    pure.contributionDue(D("2190-01-01"), D("2199-03-01"), 2199, 3, true),
    true,
    "left on the 1st: the month still counts in full",
  );
  assert.equal(
    pure.contributionDue(D("2190-01-01"), D("2199-02-28"), 2199, 3, true),
    false,
  );
  assert.equal(pure.completedYears(D("2196-05-10"), D("2199-05-09")), 2);
  assert.equal(pure.completedYears(D("2196-05-10"), D("2199-05-10")), 3);

  const wageTest = pure.monthlyContributions({
    components: [
      {
        id: "wage-test",
        code: "eos",
        nameEn: "EOS",
        nameAr: "نهاية الخدمة",
        appliesTo: ["expat"],
        employeePercent: 0,
        employerPercent: 4.2,
        serviceTiers: [],
        wageBasis: "basic",
        minWage: null,
        maxWage: null,
        effectiveFrom: "2199-01-01",
        effectiveTo: null,
        isActive: true,
      },
    ],
    profile: {
      category: "expat",
      registeredWage: 2000,
      overrides: [{ code: "eos", wage: 1100 }],
      effectiveFrom: "2199-01-01",
      effectiveTo: null,
    },
    rules: { firstOfMonthRule: true, wageSource: "registered" },
    pay: parts,
    hireDate: D("2199-01-01"),
    year: 2199,
    month: 2,
  });
  close(
    wageTest.employer,
    46.2,
    "component wage can include a social allowance without changing the gross registered wage",
  );
  const gratuity = require("../packages/database/src/hr/final-settlement.ts");
  assert.ok(
    gratuity.leavingIndemnity({
      rules: { ...gratuity.DEFAULT_GRATUITY_RULES, enabled: true, appliesTo: ["expat"], serviceUntil: "2024-02-29" },
      category: "expat",
      hireDate: D("2023-10-01"),
      lastWorkingDay: D("2024-01-01"),
      monthlyWage: 1000,
    }).amount > 0,
    "fractional-year service earns employer indemnity before the configured cutoff",
  );

  try {
    await db.$transaction(
      (tx) =>
        transactionContext.run(tx, async () => {
          const actor = await tx.user.findFirstOrThrow({
            where: { role: "super_admin", isActive: true },
            select: { id: true },
          });
          await settings.updateHrPolicy(
            { ...engine.DEFAULT_HR_POLICY },
            actor.id,
          );
          await tx.employee.updateMany({ data: { status: "suspended" } });
          await tx.payrollRun.deleteMany({ where: { year: { gte: 2199 } } });
          // A clean set of components for the test years.
          await tx.gosiComponent.updateMany({ data: { isActive: false } });
          const component = (
            code,
            appliesTo,
            employee,
            employer,
            from,
            extra = {},
          ) =>
            gosi.scheduleGosiComponent(
              {
                code,
                name_en: code,
                name_ar: code,
                applies_to: appliesTo,
                employee_percent: employee,
                employer_percent: employer,
                service_tiers: [],
                wage_basis: "fixed",
                max_wage: 4000,
                effective_from: from,
                ...extra,
              },
              actor.id,
            );
          await component("t_pension", ["bahraini"], 7, 12, "2199-01-01");
          await component(
            "t_unemployment",
            ["bahraini", "expat"],
            1,
            1,
            "2199-01-01",
          );
          await component(
            "t_hazards",
            ["bahraini", "expat"],
            0,
            3,
            "2199-01-01",
          );
          await component("t_eos", ["expat"], 0, 4.2, "2199-01-01", {
            service_tiers: [
              { from_years: 3, employee_percent: 0, employer_percent: 8.4 },
            ],
            max_wage: null,
          });
          // The law changes from June: pension rises to 8% for the employee. May keeps 7%.
          await component("t_pension", ["bahraini"], 8, 12, "2199-06-01");
          await rejects(
            component("t_pension", ["bahraini"], 9, 12, "2199-06-01"),
            "Rates already start on that date; edit them instead",
          );
          const versions = (await gosi.listGosiComponents()).filter(
            (c) => c.code === "t_pension",
          );
          assert.deepEqual(
            versions.map((v) => [v.effectiveFrom, v.effectiveTo]),
            [
              ["2199-06-01", null],
              ["2199-01-01", "2199-05-31"],
            ],
            "the old rate ends the day before",
          );

          // ---- employees
          const local = await createEmployee(
            {
              firstNameEn: "Gosi",
              lastNameEn: "Local",
              firstNameAr: "تأمين",
              lastNameAr: "محلي",
              jobTitleEn: "Editor",
              jobTitleAr: "محرر",
              hireDate: D("2199-02-01"),
              basicSalary: 1000,
              housingAllowance: 200,
              nationality: "BH",
            },
            actor.id,
          );
          const joiner = await createEmployee(
            {
              firstNameEn: "Gosi",
              lastNameEn: "Joiner",
              firstNameAr: "تأمين",
              lastNameAr: "منضم",
              jobTitleEn: "Editor",
              jobTitleAr: "محرر",
              hireDate: D("2199-05-16"),
              basicSalary: 900,
              nationality: "BH",
            },
            actor.id,
          );
          const expat = await createEmployee(
            {
              firstNameEn: "Gosi",
              lastNameEn: "Expat",
              firstNameAr: "تأمين",
              lastNameAr: "وافد",
              jobTitleEn: "Editor",
              jobTitleAr: "محرر",
              hireDate: D("2195-01-01"),
              basicSalary: 2000,
              housingAllowance: 300,
              nationality: "IN",
            },
            actor.id,
          );
          await tx.employee.update({
            where: { id: local.id },
            data: { nationality: "BH" },
          });
          await tx.employee.update({
            where: { id: joiner.id },
            data: { nationality: "BH" },
          });
          await tx.employee.update({
            where: { id: expat.id },
            data: { nationality: "IN" },
          });
          const result = await gosi.registerUnregisteredEmployees(
            "2199-01-01",
            actor.id,
          );
          assert.ok(result.registered >= 3);
          const registration = async (id) =>
            (await gosi.listEmployeeGosiRecords(id))[0];
          assert.equal((await registration(local.id)).category, "bahraini");
          assert.equal((await registration(expat.id)).category, "expat");

          // ---- support: Wage support fund for the local hire, 70% capped at 400 for a secondary-school graduate
          const program = await tx.supportProgram.create({
            data: {
              code: `t_tamkeen_${Date.now()}`,
              nameEn: "T",
              nameAr: "ت",
              provider: "Wage support fund",
              claimPeriodMonths: 3,
              prorate: true,
            },
          });
          await support.scheduleSupportRule(
            program.id,
            {
              effective_from: "2199-01-01",
              wage_basis: "fixed",
              schedule: [
                { year: 1, percent: 70 },
                { year: 2, percent: 50 },
              ],
              monthly_cap: 800,
              qualification_caps: [{ qualification: "secondary", cap: 400 }],
            },
            actor.id,
          );
          await rejects(
            support.saveEmployeeSupport(
              {
                employee_id: local.id,
                program_id: program.id,
                status: "partially_approved",
                start_month: "2199-02",
              },
              actor.id,
            ),
            "For a partial approval, enter the approved share or the approved monthly amount",
          );
          const enrolment = await support.saveEmployeeSupport(
            {
              employee_id: local.id,
              program_id: program.id,
              status: "applied",
              qualification: "secondary",
              start_month: "2199-02",
            },
            actor.id,
          );
          // A joiner enrolled from their first month: support follows the half month they were paid.
          await support.saveEmployeeSupport(
            {
              employee_id: joiner.id,
              program_id: program.id,
              status: "approved",
              start_month: "2199-05",
            },
            actor.id,
          );

          const run = async (month) => {
            const r = await payroll.createPayrollRun(month, 2199, actor.id);
            const item = (id) => r.items.find((i) => i.employeeId === id);
            return {
              r,
              local: item(local.id),
              joiner: item(joiner.id),
              expat: item(expat.id),
            };
          };

          const may = await run(5);
          close(may.local.gosiEmployee, 96, "May: 7% + 1% of 1,200");
          close(may.local.gosiEmployer, 192, "May: 12% + 1% + 3%");
          close(
            may.local.externalSupport,
            0,
            "an application pays nothing until it is approved",
          );
          close(
            may.joiner.gosiEmployee,
            0,
            "joined on 16 May: no contribution for May",
          );
          // 900 × 70% = 630, for the 16 of 31 days paid.
          close(
            may.joiner.externalSupport,
            Math.round(630 * (16 / 31) * 1000) / 1000,
            "support follows the share of the month paid",
          );
          close(may.expat.gosiEmployee, 23, "expatriate: 1% unemployment");
          close(
            may.expat.gosiEmployer,
            (2300 * (1 + 3 + 8.4)) / 100,
            "expatriate past three years: end-of-service at 8.4%",
          );
          assert.equal(
            may.local.calculationSnapshot.gosi.lines.length,
            3,
            "the month keeps the contributions it was worked out under",
          );

          await support.saveEmployeeSupport(
            {
              employee_id: local.id,
              program_id: program.id,
              status: "approved",
              qualification: "secondary",
              start_month: "2199-02",
              decided_on: "2199-05-20",
            },
            actor.id,
            enrolment.id,
          );
          const history = (
            await support.listEmployeeSupports({ employeeId: local.id })
          )[0].events;
          assert.ok(
            history.some((e) => e.action === "status_approved"),
            "the decision is kept in the enrolment's history",
          );
          const june = await run(6);
          close(
            june.local.gosiEmployee,
            108,
            "June: the new 8% pension applies",
          );
          close(
            june.local.externalSupport,
            280,
            "70% of the qualification wage cap of 400",
          );
          close(june.joiner.gosiEmployee, 81, "a full month: 8% + 1% of 900");

          // Partial approval: 40% instead of the schedule. A registered wage replaces the contract pay.
          await support.saveEmployeeSupport(
            {
              employee_id: local.id,
              program_id: program.id,
              status: "partially_approved",
              approved_percent: 25,
              qualification: "secondary",
              start_month: "2199-02",
            },
            actor.id,
            enrolment.id,
          );
          await gosi.saveEmployeeGosiRecord(
            local.id,
            {
              category: "bahraini",
              registered_wage: 1000,
              overrides: [{ code: "t_unemployment", exempt: true }],
              effective_from: "2199-07-01",
            },
            actor.id,
          );
          const july = await run(7);
          close(
            july.local.externalSupport,
            100,
            "25% of the qualification wage cap of 400",
          );
          close(
            july.local.gosiEmployee,
            80,
            "8% of the registered 1,000, unemployment waived",
          );
          const claims =
            await require("../packages/database/src/queries/support-claims.ts").getSupportClaims();
          assert.ok(
            claims.length === 0 || claims.every((c) => c.accrued >= 0),
            "support claims read the months' support lines",
          );

          // ---- final settlement for the expatriate leaving on 12 August
          const user = await tx.user.create({
            data: {
              email: `expat-${Date.now()}@gosi.test`,
              fullName: "Gosi Expat",
              passwordHash: "x",
              role: "sales",
              commissionRatePercent: 0,
            },
          });
          await tx.employee.update({
            where: { id: expat.id },
            data: { userId: user.id },
          });
          await tx.expenseClaim.create({
            data: { currency: "BHD",
              claimNumber: `CLM-T-${Date.now()}`,
              claimantId: user.id,
              amount: 45.5,
              expenseDate: D("2199-08-01"),
              reason: "Taxi",
              receiptUrl: "https://example.com/r.pdf",
              status: "approved",
            },
          });
          await tx.employeeRecurringPay.create({
            data: {
              employeeId: expat.id,
              kind: "deduction",
              category: "loan_repayment",
              label: "Car loan",
              amount: 100,
              startMonth: "2199-01",
              endMonth: "2199-12",
            },
          });
          for (const m of [5, 6, 7])
            await tx.payrollRun.update({
              where: { year_month: { year: 2199, month: m } },
              data: { status: "paid" },
            });
          await rejects(
            settlements.createFinalSettlement(
              {
                employee_id: expat.id,
                reason: "quit",
                last_working_day: "2199-08-12",
              },
              actor.id,
            ),
            "Choose why the employee is leaving",
          );
          const created = await settlements.createFinalSettlement(
            {
              employee_id: expat.id,
              reason: "resignation",
              last_working_day: "2199-08-12",
            },
            actor.id,
          );
          await rejects(
            settlements.createFinalSettlement(
              {
                employee_id: expat.id,
                reason: "resignation",
                last_working_day: "2199-08-12",
              },
              actor.id,
            ),
            "This employee already has a settlement in progress",
          );
          let detail = await settlements.getFinalSettlement(created.id);
          const line = (category) =>
            detail.lines.filter((l) => l.category === category);
          const amount = (category) =>
            line(category).reduce((s, l) => s + l.amount, 0);
          assert.deepEqual(
            detail.calculation.unpaidMonths,
            ["2199-08"],
            "only August is not covered by payroll",
          );
          close(amount("salary"), 2300, "August salary");
          close(
            amount("not_employed"),
            (2300 * 19) / 31,
            "13 to 31 August are not paid",
          );
          close(
            amount("social_insurance"),
            23,
            "employed on 1 August: the month's contribution is due in full",
          );
          close(amount("reimbursement"), 45.5, "approved claim reimbursed");
          close(
            line("loan").find((l) => /Balance/.test(l.labelEn)).amount,
            400,
            "four car-loan instalments still owed",
          );
          close(
            line("loan").find((l) => !/Balance/.test(l.labelEn)).amount,
            100,
            "August's instalment",
          );
          close(
            amount("indemnity"),
            0,
            "service after the SIO end-of-service scheme started earns no employer indemnity",
          );
          assert.ok(
            amount("leave_encashment") > 0,
            "unused annual leave is paid out",
          );
          close(
            detail.netAmount,
            detail.totalAdditions - detail.totalDeductions,
            "net",
          );

          // With every year counted (no SIO cut-off): half a month of basic for each of the first 3 years, a month after.
          const rules = await settlements.getSettlementRules();
          await settlements.updateSettlementRules(
            { ...rules, gratuity: { ...rules.gratuity, serviceUntil: null } },
            actor.id,
          );
          await settlements.recalculateFinalSettlement(created.id);
          detail = await settlements.getFinalSettlement(created.id);
          const years =
            (Math.floor((D("2199-08-12") - D("2195-01-01")) / 86400000) + 1) /
            365;
          close(
            amount("indemnity"),
            Math.round(2000 * (3 * 0.5 + (years - 3)) * 1000) / 1000,
            "leaving indemnity on basic pay",
          );

          await settlements.setFinalSettlementManualLines(created.id, [
            {
              kind: "deduction",
              category: "notice_shortfall",
              label_en: "Notice not served (5 days)",
              label_ar: "فترة إشعار غير مكتملة",
              amount: 200,
            },
          ]);
          await settlements.recalculateFinalSettlement(created.id);
          detail = await settlements.getFinalSettlement(created.id);
          assert.ok(
            detail.lines.some((l) => l.source === "manual" && l.amount === 200),
            "manual lines survive recalculation",
          );

          await settlements.submitFinalSettlement(created.id, actor.id);
          // A live-signature request must wait for an explicit signature even for Super Admin.
          await assert.rejects(
            settlements.setFinalSettlementManualLines(created.id, []),
            /it can only be changed while it is a draft/,
          );
          const signature = `data:image/png;base64,${(
            await require(
              require.resolve("sharp", {
                paths: [
                  require("node:path").resolve(__dirname, "../apps/admin"),
                ],
              }),
            )(
              Buffer.from(
                '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><path d="M20 150 C 120 20, 220 180, 320 60" stroke="#111" stroke-width="5" fill="none"/></svg>',
              ),
            )
              .png()
              .toBuffer()
          ).toString("base64")}`;
          for (let i = 0; i < 4; i++) {
            const pending = await findPendingApproval(
              "final_settlement",
              created.id,
            );
            if (!pending) break;
            await decideApprovalRequest(
              pending.id,
              actor.id,
              "approved",
              "ok",
              signature,
            );
          }
          assert.equal(
            (
              await tx.finalSettlement.findUniqueOrThrow({
                where: { id: created.id },
              })
            ).status,
            "approved",
          );
          await settlements.signFinalSettlementAsEmployee(created.id, {
            signature,
            signer_name: "Gosi Expat",
          });
          const includedClaim = await tx.expenseClaim.findFirstOrThrow({
            where: { claimantId: user.id },
          });
          await tx.expenseClaim.update({
            where: { id: includedClaim.id },
            data: { amount: 40 },
          });
          await assert.rejects(
            settlements.payFinalSettlement(
              created.id,
              { method: "bank_transfer" },
              actor.id,
            ),
            /included payment has changed/,
          );
          assert.equal(
            (
              await tx.finalSettlement.findUniqueOrThrow({
                where: { id: created.id },
              })
            ).status,
            "approved",
            "stale payment leaves settlement unchanged",
          );
          await tx.expenseClaim.update({
            where: { id: includedClaim.id },
            data: { amount: 45.5 },
          });
          // Simulate a calculated, approved commission line and verify the existing monthly ledger is advanced once.
          await tx.finalSettlementLine.create({
            data: {
              settlementId: created.id,
              kind: "addition",
              category: "commission",
              labelEn: "Test commission",
              labelAr: "عمولة",
              amount: 50,
              details: {
                userId: user.id,
                month: "2199-08",
                basis: 1000,
                ratePercent: 5,
                paidAmount: 0,
              },
            },
          });
          await tx.finalSettlement.update({
            where: { id: created.id },
            data: {
              totalAdditions: { increment: 50 },
              netAmount: { increment: 50 },
            },
          });
          await settlements.payFinalSettlement(
            created.id,
            { method: "bank_transfer", reference: "TRX-1" },
            actor.id,
          );
          close(
            (
              await tx.commissionPayout.findUniqueOrThrow({
                where: {
                  userId_periodMonth: {
                    userId: user.id,
                    periodMonth: "2199-08",
                  },
                },
              })
            ).amount,
            50,
            "settlement payment records commission to prevent paying it again",
          );
          await assert.rejects(
            settlements.payFinalSettlement(
              created.id,
              { method: "bank_transfer" },
              actor.id,
            ),
            /once it is approved/,
          );
          const after = await tx.employee.findUniqueOrThrow({
            where: { id: expat.id },
            include: { gosiRecords: true },
          });
          assert.equal(
            after.status,
            "terminated",
            "the employee is marked as left",
          );
          assert.equal(
            after.gosiRecords.find(
              (r) => !r.effectiveTo || r.effectiveTo > D("2199-08-12"),
            ),
            undefined,
            "the GOSI registration ends on the last working day",
          );
          assert.equal(
            (
              await tx.expenseClaim.findFirstOrThrow({
                where: { claimantId: user.id },
              })
            ).status,
            "paid",
            "the claim is closed as paid",
          );
          assert.equal(
            await tx.employeeRecurringPay.count({
              where: { employeeId: expat.id, isActive: true },
            }),
            0,
            "the loan is closed",
          );
          const claimRows =
            await require("../packages/database/src/queries/support-claims.ts").getSupportClaims();
          const customClaim = claimRows.find(
            (c) =>
              c.employeeId === local.id &&
              c.provider === "Wage support fund" &&
              c.periodStart === "2199-05",
          );
          assert.equal(
            customClaim.periodEnd,
            "2199-07",
            "claim intervals follow the snapshotted programme settings",
          );
          close(
            customClaim.accrued,
            380,
            "support claims match the actual supported payroll amounts",
          );
          await tx.payrollItem.deleteMany({
            where: {
              employeeId: local.id,
              payrollRun: { year: 2199, month: 6 },
            },
          });
          const gap = await settlements.calculateSettlement(
            local.id,
            D("2199-08-12"),
          );
          assert.deepEqual(
            gap.calculation.unpaidMonths,
            ["2199-06", "2199-08"],
            "settlements include missing payroll months even when a later month is covered",
          );
          throw rollback;
        }),
      { timeout: 180000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    "Social insurance and settlement checks passed and rolled back: dated rate changes, the 1st-of-month rule, service bands, registered wages and exemptions, Wage support fund schedule with qualification caps, partial approval and proration, and a final settlement from calculation through approval, signing and payment.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
