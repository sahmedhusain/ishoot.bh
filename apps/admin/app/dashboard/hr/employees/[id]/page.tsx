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

  const [found, departments, canEdit, canViewPay, canEditPay] = await Promise.all([
    getEmployeeById(id),
    listDepartments(),
    hasPermission("employees", "edit"),
    hasPermission("payroll", "read"),
    hasPermission("payroll", "edit"),
  ]);
  // Salary history stays on the server for people without payroll access.
  const employee = found && !canViewPay ? { ...found, employmentRecords: [] } : found;

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
      canViewPay={canViewPay}
      canEditPay={canEditPay}
    />
    <EmployeeAttachments employeeId={id} attachments={attachments} canEdit={canEdit} canDelete={await hasPermission("employees", "delete")} />
    {canManage && <SalaryDocumentsView embedded employeeId={id} availableMonths={availableMonths} decidableIds={decidableIds} documents={documents.map(item => ({ id: item.id, kind: item.kind, status: item.status, months: item.months as string[], createdAt: item.createdAt.toISOString(), reviewNotes: item.reviewNotes }))} />}
    </div>
  );
}
