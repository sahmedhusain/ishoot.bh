import { serverMessages } from "@platform/locales";
import { db, hasPermission, canDecideApproval } from "@platform/database";
import type { Profile } from "@platform/database";

export async function canManageSalaryDocuments(user: Profile) {
  return await hasPermission(
    user.role,
    "payroll",
    "issue_send",
    user.permissions,
  );
}
/**
 * Sending a salary document to the employee by e-mail or WhatsApp is for HR issuing it to someone else.
 * The person who asked for their own payslip or certificate only views, downloads or prints it.
 */
export async function canShareSalaryDocument(
  document: { employee: { userId: string | null } },
  user: Profile,
) {
  return (
    document.employee.userId !== user.id &&
    (await canManageSalaryDocuments(user))
  );
}
export interface SalaryDocumentRecord {
  id: string;
  employeeId: string;
  kind: string;
  months: unknown;
  /** Languages the employee asked for ("ar", "en"). */
  languages: string[];
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
    throw new Error(serverMessages.salaryDocumentAccessDenied);
  return document;
}

/** Months (YYYY-MM) with approved, paid or closed payroll for this employee — the only ones a payslip can cover. */
export async function availablePayslipMonths(
  employeeId: string,
): Promise<string[]> {
  const items = await db.payrollItem.findMany({
    where: {
      employeeId,
      payrollRun: { status: { in: ["approved", "paid", "closed"] } },
    },
    select: { payrollRun: { select: { year: true, month: true } } },
  });
  return items
    .map(
      ({ payrollRun }) =>
        `${payrollRun.year}-${String(payrollRun.month).padStart(2, "0")}`,
    )
    .sort()
    .reverse();
}

/** Salary document ids (from `ids`) the user may issue or reject now, per the approval policy. */
export async function decidableSalaryDocumentIds(
  user: Profile,
  ids: string[],
): Promise<string[]> {
  if (!ids.length) return [];
  const pending = await db.approvalRequest.findMany({
    where: {
      targetType: "salary_document",
      targetId: { in: ids },
      status: "pending",
    },
    select: {
      targetId: true,
      status: true,
      requestedById: true,
      approverIds: true,
    },
  });
  return pending
    .filter((request) => canDecideApproval(request, user))
    .map((request) => request.targetId);
}
