import { serverMessages } from "@platform/locales";
import { hasPermission, canDecideApproval } from "@platform/database";
import type { Profile } from "@platform/database";
import { listTableRows } from "./api/tables";

export async function canManageSalaryDocuments(user: Profile) {
  return await hasPermission(
    user.role,
    "payroll",
    "issue_send",
    user.permissions,
  );
}
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
  const [docs, employees] = await Promise.all([
    listTableRows<Record<string, any>>("hr", "salary_document"),
    listTableRows<Record<string, any>>("hr", "employee"),
  ]);
  const rawDoc = docs.find((d) => d.id === id);
  const employee = rawDoc ? employees.find((e) => e.id === rawDoc.employeeId) : null;
  if (
    !rawDoc ||
    !employee ||
    (employee.userId !== user.id && !(await canManageSalaryDocuments(user)))
  )
    throw new Error(serverMessages.salaryDocumentAccessDenied);
  return {
    ...(rawDoc as any),
    createdAt: new Date(rawDoc.createdAt),
    updatedAt: new Date(rawDoc.updatedAt),
    issuedAt: rawDoc.issuedAt ? new Date(rawDoc.issuedAt) : null,
    employee,
  } as SalaryDocumentRecord;
}

export async function availablePayslipMonths(
  employeeId: string,
): Promise<string[]> {
  const [items, runs] = await Promise.all([
    listTableRows<Record<string, any>>("hr", "payroll_item"),
    listTableRows<Record<string, any>>("hr", "payroll_run"),
  ]);
  const validRunIds = new Set(["approved", "paid", "closed"]);
  const runMap = new Map(runs.map((r) => [r.id, r] as const));
  return items
    .filter((i) => i.employeeId === employeeId)
    .map((i) => runMap.get(i.payrollRunId))
    .filter((r): r is Record<string, any> => !!r && validRunIds.has(r.status))
    .map(
      (payrollRun) =>
        `${payrollRun.year}-${String(payrollRun.month).padStart(2, "0")}`,
    )
    .sort()
    .reverse();
}

export async function decidableSalaryDocumentIds(
  user: Profile,
  ids: string[],
): Promise<string[]> {
  if (!ids.length) return [];
  const requests = await listTableRows<Record<string, any>>(
    "workflow",
    "approval_request",
  );
  const idSet = new Set(ids);
  const pending = requests.filter(
    (r) =>
      r.targetType === "salary_document" &&
      idSet.has(r.targetId) &&
      r.status === "pending",
  );
  return pending
    .filter((request) =>
      canDecideApproval(
        {
          status: request.status,
          requestedById: request.requestedById,
          approverIds: Array.isArray(request.approverIds)
            ? request.approverIds
            : [],
        },
        user,
      ),
    )
    .map((request) => request.targetId);
}
