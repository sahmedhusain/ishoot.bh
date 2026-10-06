import { db } from "../db";

/** Frozen copy of the data a salary document prints. Throws when payroll for a requested month is not approved. */
export async function salaryDocumentSnapshot(
  employeeId: string,
  kind: string,
  months: string[],
) {
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    include: { employmentRecords: { where: { isCurrent: true }, take: 1 }, department: { select: { nameEn: true, nameAr: true } } },
  });
  const identity = {
    employeeNumber: employee.employeeNumber,
    firstNameEn: employee.firstNameEn,
    lastNameEn: employee.lastNameEn,
    firstNameAr: employee.firstNameAr,
    lastNameAr: employee.lastNameAr,
    jobTitleEn: employee.jobTitleEn,
    jobTitleAr: employee.jobTitleAr,
    hireDate: employee.hireDate.toISOString(),
    departmentEn: employee.department?.nameEn ?? null,
    departmentAr: employee.department?.nameAr ?? null,
  };
  if (kind === "salary_certificate") {
    const record = employee.employmentRecords[0];
    if (!record) throw new Error("Employee compensation is missing");
    return JSON.parse(
      JSON.stringify({ employee: identity, compensation: record }),
    );
  }
  const items = await db.payrollItem.findMany({
    where: {
      employeeId,
      payrollRun: {
        status: { in: ["approved", "paid", "closed"] },
        OR: months.map((value) => ({
          year: Number(value.slice(0, 4)),
          month: Number(value.slice(5)),
        })),
      },
    },
    include: {
      payrollRun: { select: { month: true, year: true, status: true, periodStart: true, periodEnd: true, attendanceStart: true, attendanceEnd: true, payDate: true } },
    },
    orderBy: { payrollRun: { periodStart: "asc" } },
  });
  if (items.length !== months.length)
    throw new Error("Approved payroll is required for every selected month");
  return JSON.parse(JSON.stringify({ employee: identity, items }));
}
