import { db, hasPermission } from "@ishoot/database";
import type { Profile } from "@ishoot/database";

export async function canManageSalaryDocuments(user: Profile) {
  return (
    (await hasPermission(user.role, "employees", "edit", user.permissions)) &&
    (await hasPermission(user.role, "payroll", "read", user.permissions))
  );
}
export interface SalaryDocumentRecord {
  id: string;
  employeeId: string;
  kind: string;
  months: unknown;
  status: string;
  snapshot: unknown;
  requestedById: string;
  reviewedById: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  issuedAt: Date | null;
  employee: {
    id: string;
    userId: string | null;
    email: string | null;
    employeeNumber: string;
    phone: string | null;
  };
}
export async function getAccessibleSalaryDocument(
  id: string,
  user: Profile,
): Promise<SalaryDocumentRecord> {
  const document = await db.salaryDocument.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (
    !document ||
    (document.employee.userId !== user.id &&
      !(await canManageSalaryDocuments(user)))
  )
    throw new Error("Salary document access denied");
  return document;
}
export async function salaryDocumentSnapshot(
  employeeId: string,
  kind: string,
  months: string[],
) {
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    include: { employmentRecords: { where: { isCurrent: true }, take: 1 } },
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
      payrollRun: { select: { month: true, year: true, status: true } },
    },
    orderBy: { payrollRun: { periodStart: "asc" } },
  });
  if (items.length !== months.length)
    throw new Error("Approved payroll is required for every selected month");
  return JSON.parse(JSON.stringify({ employee: identity, items }));
}
