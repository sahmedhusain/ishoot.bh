import { EmployeeAttachments } from "../../../../../components/hr/EmployeeAttachments";
import { SalaryDocumentsView } from "../../../../../components/hr/SalaryDocumentsView";
import { availablePayslipMonths, canManageSalaryDocuments, decidableSalaryDocumentIds } from "../../../../../lib/salary-documents";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "../../../../../lib/auth";
import { getEmployeeById, listDepartments, db } from "@ishoot/database";
import { EmployeeDetailView } from "../../../../../components/hr/EmployeeDetailView";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("employees", "read");
  const { id } = await params;

  const [employee, departments, canEdit] = await Promise.all([
    getEmployeeById(id),
    listDepartments(),
    hasPermission("employees", "edit"),
  ]);

  if (!employee) {
    notFound();
  }

  const attachments = await db.attachment.findMany({ where: { entityType: "employee", entityId: id }, select: { id: true, fileName: true, fileUrl: true }, orderBy: { createdAt: "desc" } });
  const canManage = await canManageSalaryDocuments(actor);
  const documents = canManage ? await db.salaryDocument.findMany({ where: { employeeId: id }, orderBy: { createdAt: "desc" } }) : [];
  const [availableMonths, decidableIds] = canManage
    ? await Promise.all([
        availablePayslipMonths(id),
        decidableSalaryDocumentIds(actor, documents.filter((d) => d.status === "pending").map((d) => d.id)),
      ])
    : [[], []];
  return (
    <div className="space-y-6">
    <EmployeeDetailView
      employee={employee}
      departments={departments}
      canEdit={canEdit}
    />
    <EmployeeAttachments employeeId={id} attachments={attachments} canEdit={canEdit} />
    {canManage && <SalaryDocumentsView employeeId={id} availableMonths={availableMonths} decidableIds={decidableIds} documents={documents.map(item => ({ id: item.id, kind: item.kind, status: item.status, months: item.months as string[], createdAt: item.createdAt.toISOString(), reviewNotes: item.reviewNotes }))} />}
    </div>
  );
}
