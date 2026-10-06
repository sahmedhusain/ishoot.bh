import { requirePagePermission } from "../../../../lib/auth";
import { db } from "@ishoot/database";
import {
  availablePayslipMonths,
  canManageSalaryDocuments,
  decidableSalaryDocumentIds,
} from "../../../../lib/salary-documents";
import { SalaryDocumentsView } from "../../../../components/hr/SalaryDocumentsView";

export const dynamic = "force-dynamic";

export default async function SalaryDocumentsPage() {
  const user = await requirePagePermission("self_service", "read");
  const [canManage, employee, awaitingMe] = await Promise.all([
    canManageSalaryDocuments(user),
    db.employee.findUnique({ where: { userId: user.id }, select: { id: true } }),
    db.approvalRequest.findMany({
      where: { targetType: "salary_document", status: "pending", approverIds: { has: user.id } },
      select: { targetId: true },
    }),
  ]);
  const documents = await db.salaryDocument.findMany({
    where: canManage
      ? {}
      : { OR: [{ employee: { userId: user.id } }, { id: { in: awaitingMe.map((a) => a.targetId) } }] },
    include: { employee: { select: { firstNameEn: true, lastNameEn: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const [availableMonths, decidableIds] = await Promise.all([
    employee ? availablePayslipMonths(employee.id) : Promise.resolve([]),
    decidableSalaryDocumentIds(user, documents.filter((d) => d.status === "pending").map((d) => d.id)),
  ]);
  return (
    <SalaryDocumentsView
      employeeId={employee?.id}
      availableMonths={availableMonths}
      decidableIds={decidableIds}
      showNoProfile
      documents={documents.map((item) => ({
        id: item.id,
        kind: item.kind,
        status: item.status,
        months: item.months as string[],
        createdAt: item.createdAt.toISOString(),
        reviewNotes: item.reviewNotes,
        employeeName: `${item.employee.firstNameEn} ${item.employee.lastNameEn}`,
      }))}
    />
  );
}
