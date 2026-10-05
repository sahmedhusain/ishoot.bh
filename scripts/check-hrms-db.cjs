require('dotenv').config({ quiet: true });
require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', target: 'ES2022', moduleResolution: 'Node', esModuleInterop: true, resolveJsonModule: true } });
const assert = require('node:assert/strict');
const { db } = require('../packages/database/src/db.ts');
const { transactionContext } = require('../packages/database/src/transaction-context.ts');
const { createEmployee, updateEmployee, getEmployeeById } = require('../packages/database/src/queries/hrms.ts');
const { createPayrollRun, submitPayrollRunForApproval } = require('../packages/database/src/queries/payroll.ts');
const { createLeaveRequest, approveLeaveRequest } = require('../packages/database/src/queries/leave.ts');
const { salaryDocumentSnapshot } = require('../packages/database/src/queries/salary-documents.ts');
const { decideApprovalRequest } = require('../packages/database/src/services/approval-engine.ts');
const rollback = new Error('ROLLBACK_HRMS_TEST');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','::1'].includes(url.hostname), 'Run only against a local test/development database');
  try {
    await db.$transaction(tx => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: 'super_admin', isActive: true }, select: { id: true } });
      const hireDate = new Date('2198-01-01T00:00:00Z');
      const employee = await createEmployee({ firstNameEn: 'HRMS', lastNameEn: 'Test', firstNameAr: 'اختبار', lastNameAr: 'الموظف', jobTitleEn: 'Test employee', jobTitleAr: 'موظف اختبار', hireDate, basicSalary: 1000, housingAllowance: 100, payrollSettings: { employee: { mode: 'percentage', value: 8 }, employer: { mode: 'fixed', value: 120 }, supports: [{ provider: 'Tamkeen test', mode: 'percentage', value: 50, startMonth: '2199-01', endMonth: '2199-02' }] } }, actor.id);
      assert.equal(employee.userId, null, 'Employees must exist before login accounts');
      const record = employee.employmentRecords[0];
      await updateEmployee(employee.id, { transportAllowance: 25 }, actor.id);
      const updated = await getEmployeeById(employee.id);
      const current = updated.employmentRecords.find(item => item.isCurrent);
      assert.equal(current.basicSalary, 1000);
      assert.equal(current.housingAllowance, 100);
      assert.equal(current.transportAllowance, 25);
      assert.equal(current.payrollSettings.employee.value, 8);
      assert.ok(updated.employmentRecords.some(item => item.id === record.id && !item.isCurrent));
      // Scope the generated payroll to fixtures; the entire transaction is rolled back.
      await tx.employee.updateMany({ where: { id: { not: employee.id } }, data: { status: 'suspended' } });
      await tx.employee.update({ where: { id: employee.id }, data: { status: 'on_leave' } });
      const run = await createPayrollRun(1, 2199, actor.id);
      assert.equal(run.items.length, 1, 'On-leave employees remain in payroll');
      assert.equal(run.totalGross, 1125);
      assert.equal(run.totalNet, 1035);
      assert.equal(run.totalEmployerCost, 682.5);
      assert.equal(Number((await tx.payrollItem.findFirstOrThrow({ where: { payrollRunId: run.id } })).externalSupport), 562.5);
      const approval = await submitPayrollRunForApproval(run.id, actor.id);
      const pending = await tx.approvalRequest.findUniqueOrThrow({ where: { id: approval.approvalRequestId } });
      if (pending.status === 'pending') {
        // The submitter never approves their own payroll; someone the policy names does.
        await assert.rejects(decideApprovalRequest(pending.id, actor.id, 'approved'), /your own request/);
        await decideApprovalRequest(pending.id, pending.approverIds[0], 'approved');
      } else {
        const decision = await tx.approvalDecision.findFirstOrThrow({ where: { approvalRequestId: pending.id } });
        assert.ok(pending.selfApproved || decision.reason === 'super_admin', 'only Super Admin or a sole administrator skips review, and it is recorded');
      }
      assert.equal((await tx.approvalRequest.findUniqueOrThrow({ where: { id: pending.id } })).status, 'approved');
      assert.equal((await tx.payrollRun.findUniqueOrThrow({ where: { id: run.id } })).status, 'approved');
      const snapshot = await salaryDocumentSnapshot(employee.id, 'payslip', ['2199-01']);
      assert.equal(snapshot.items.length, 1);
      assert.equal(Number(snapshot.items[0].netSalary), 1035);
      await assert.rejects(salaryDocumentSnapshot(employee.id, 'payslip', ['2199-01','2199-02']), /Approved payroll is required/);
      const leaveType = await tx.leaveType.create({ data: { code: `test-${employee.id}`, nameEn: 'Test paid leave', nameAr: 'إجازة اختبار', isPaid: true } });
      const leave = await createLeaveRequest({ employeeId: employee.id, leaveTypeId: leaveType.id, startDate: new Date('2199-04-01'), endDate: new Date('2199-04-02'), reason: 'Integration test' });
      await approveLeaveRequest(leave.id, actor.id);
      assert.equal(Number((await tx.employee.findUniqueOrThrow({ where: { id: employee.id } })).leaveBalanceDays), 28);
      throw rollback;
    }), { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log('HRMS database checks passed and rolled back: employee-first creation, compensation history, support snapshots, on-leave payroll, policy-routed payroll approval (no self-approval), salary month validation and leave balance.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
