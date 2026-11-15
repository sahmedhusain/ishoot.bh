import { serverMessages } from "@platform/locales";
import {
  getEmployeeRelations,
  listAllPayrollItemsApi,
  listDepartments,
  listPayrollRuns,
} from "../api/hr";

export async function salaryDocumentSnapshot(
  employeeId: string,
  kind: string,
  months: string[],
) {
  const [employee, departments] = await Promise.all([
    getEmployeeRelations(employeeId),
    listDepartments().catch(() => []),
  ]);
  const dep = employee.departmentId
    ? departments.find((d: any) => d.id === employee.departmentId)
    : null;
  const identity = {
    employeeNumber: employee.employeeNumber,
    firstNameEn: employee.firstNameEn,
    lastNameEn: employee.lastNameEn,
    firstNameAr: employee.firstNameAr,
    lastNameAr: employee.lastNameAr,
    jobTitleEn: employee.jobTitleEn,
    jobTitleAr: employee.jobTitleAr,
    hireDate: employee.hireDate,
    departmentEn: dep?.nameEn ?? null,
    departmentAr: dep?.nameAr ?? null,
  };
  if (kind === "salary_certificate") {
    const empRecords = (employee as any).employmentRecords ?? [];
    const record = empRecords.find((r: any) => r.isCurrent) ?? empRecords[0];
    if (!record) throw new Error(serverMessages.employeeCompensationIsMissing);
    return JSON.parse(
      JSON.stringify({ employee: identity, compensation: record }),
    );
  }
  const [allItems, runs] = await Promise.all([
    listAllPayrollItemsApi(),
    listPayrollRuns(),
  ]);
  const runById = new Map<string, any>(runs.map((r: any) => [r.id, r]));
  const wanted = new Set(months);
  const items = allItems
    .filter((item: any) => {
      if ((item.employee_id ?? item.employeeId) !== employeeId) return false;
      const run = runById.get(item.payroll_run_id ?? item.payrollRunId);
      if (!run || !["approved", "paid", "closed"].includes(run.status)) return false;
      const ym = `${run.year}-${String(run.month).padStart(2, "0")}`;
      return wanted.has(ym);
    })
    .map((item: any) => {
      const run = runById.get(item.payroll_run_id ?? item.payrollRunId);
      const { attendanceStart: _from, attendanceEnd: _to, ...restRun } = run;
      const { attendanceSummary: _attendance, attendance_summary: _a2, ...restItem } = item;
      return { ...restItem, payrollRun: restRun };
    })
    .sort((a: any, b: any) =>
      String(a.payrollRun?.periodStart ?? "").localeCompare(String(b.payrollRun?.periodStart ?? "")),
    );
  if (items.length !== months.length)
    throw new Error(serverMessages.approvedPayrollIsRequiredForEverySelected);
  return JSON.parse(JSON.stringify({ employee: identity, items }));
}
