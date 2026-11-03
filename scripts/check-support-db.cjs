// Run: node scripts/check-support-db.cjs  (local database only; everything is rolled back)
// Wage support fund wage support: 70/50/30% schedule on pre-contribution gross, six-monthly claims from approved payroll, one receipt per claim.
require('dotenv').config({ quiet: true });
require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', target: 'ES2022', moduleResolution: 'Node', esModuleInterop: true, resolveJsonModule: true } });
const assert = require('node:assert/strict');
const { db } = require('../apps/admin/lib/database/db.ts');
const { transactionContext } = require('../apps/admin/lib/database/transaction-context.ts');
const { createEmployee } = require('../apps/admin/lib/database/queries/hrms.ts');
const { createPayrollRun } = require('../apps/admin/lib/database/queries/payroll.ts');
const { supportSchedule } = require('../apps/admin/lib/database/constants/hr-support.ts');
const { getSupportClaims, recordSupportReimbursement } = require('../apps/admin/lib/database/queries/support-claims.ts');

const rollback = new Error('ROLLBACK_SUPPORT_TEST');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'Run only against a local test/development database');
  const schedule = supportSchedule('Wage support fund', '2001-03', [70, 50, 30]);
  assert.deepEqual(schedule.map((s) => [s.value, s.startMonth, s.endMonth]), [[70, '2001-03', '2002-02'], [50, '2002-03', '2003-02'], [30, '2003-03', '2004-02']]);
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: 'super_admin', isActive: true } });
      await tx.employee.updateMany({ data: { status: 'suspended' } });
      const employee = await createEmployee({
        firstNameEn: 'Support', lastNameEn: 'Test', firstNameAr: 'دعم', lastNameAr: 'اختبار', jobTitleEn: 'Editor', jobTitleAr: 'محرر',
        hireDate: new Date('2001-03-01'), basicSalary: 800, housingAllowance: 200,
        payrollSettings: { employee: { mode: 'percentage', value: 7 }, employer: { mode: 'percentage', value: 12 }, supports: schedule },
      }, actor.id);
      // Seven approved months: March–August 2001 is one full claim, September opens the next.
      for (let month = 3; month <= 9; month++) {
        const run = await createPayrollRun(month, 2001, actor.id);
        assert.equal(Number(run.items[0].externalSupport), 700, '70% of 1,000 gross before pension contributions');
        await tx.payrollRun.update({ where: { id: run.id }, data: { status: 'approved' } });
      }
      const claims = (await getSupportClaims()).filter((c) => c.employeeId === employee.id);
      const first = claims.find((c) => c.periodStart === '2001-03');
      assert.deepEqual([first.periodEnd, first.monthsAccrued, first.accrued, first.status], ['2001-08', 6, 4200, 'claimable']);
      const second = claims.find((c) => c.periodStart === '2001-09');
      assert.deepEqual([second.monthsAccrued, second.accrued], [1, 700]);
      await assert.rejects(recordSupportReimbursement({ employeeId: employee.id, provider: 'Wage support fund', periodStart: '2001-04', receivedAmount: 1, receivedOn: '2001-10-01' }, actor.id), /No support accrued/);
      await recordSupportReimbursement({ employeeId: employee.id, provider: 'Wage support fund', periodStart: '2001-03', receivedAmount: 4200, receivedOn: '2001-10-15', reference: 'TMK-1' }, actor.id);
      assert.equal((await getSupportClaims()).find((c) => c.employeeId === employee.id && c.periodStart === '2001-03').status, 'received');
      await assert.rejects(recordSupportReimbursement({ employeeId: employee.id, provider: 'Wage support fund', periodStart: '2001-03', receivedAmount: 4200, receivedOn: '2001-10-15' }, actor.id), /already recorded/);
      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log('Support database checks passed and rolled back: Wage support fund 70/50/30 schedule, support on pre-contribution gross, six-month claims from approved payroll, single receipt per claim.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
