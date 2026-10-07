import { EmployeeAttachments } from "../../../../../components/hr/EmployeeAttachments";
import { SalaryDocumentsView } from "../../../../../components/hr/SalaryDocumentsView";
import { availablePayslipMonths, canManageSalaryDocuments, decidableSalaryDocumentIds } from "../../../../../lib/salary-documents";
import { notFound } from "next/navigation";
import { requirePagePermission, hasPermission } from "../../../../../lib/auth";
import { getEmployeeById, getEmployeeAssets, getEmployeeResidency, listRecurringPay, listDepartments, db, getLeaveBalances, accountSnapshot, listAccountChangeRequests, listEmployeeHandovers } from "@ishoot/database";
import { EmployeeResidencyPanel } from "../../../../../components/hr/EmployeeResidencyPanel";
import { RecurringPayPanel } from "../../../../../components/hr/RecurringPayPanel";
import { EmployeeAssetsCard } from "../../../../../components/assets/EmployeeAssetsCard";
import { EmployeeHandoversCard } from "../../../../../components/handovers/EmployeeHandoversCard";
import { EmployeeAccountCard } from "../../../../../components/hr/EmployeeAccountCard";
import { LeaveBalancesCard } from "../../../../../components/hr/LeaveBalancesCard";
import { EmployeePayHistory } from "../../../../../components/hr/EmployeePayHistory";
import { EmployeeDetailView } from "../../../../../components/hr/EmployeeDetailView";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePagePermission("employees", "read");
  const { id } = await params;

  const [found, departments, canEdit, canViewPay, canEditPay, residency] = await Promise.all([
    getEmployeeById(id),
    listDepartments(),
    hasPermission("employees", "edit"),
    hasPermission("payroll", "read"),
    hasPermission("payroll", "edit"),
    getEmployeeResidency(id),
  ]);
  // Salary history stays on the server for people without payroll access.
  const employee = found && !canViewPay ? { ...found, employmentRecords: [] } : found;

  if (!employee) {
    notFound();
  }

  const linkedUserId = (employee as { userId?: string | null }).userId ?? null;
  const [canManageUsers, account, accountRequests, roleRows, managerRows] = await Promise.all([
    hasPermission("users", "write"),
    linkedUserId ? accountSnapshot(linkedUserId) : Promise.resolve(null),
    linkedUserId ? listAccountChangeRequests(linkedUserId) : Promise.resolve([]),
    db.role.findMany({ select: { id: true, nameEn: true, nameAr: true }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);
  const year = new Date().getUTCFullYear();
  const [balances, payItems, recurringPay] = await Promise.all([
    getLeaveBalances(id, year),
    canViewPay
      ? db.payrollItem.findMany({
          where: { employeeId: id },
          orderBy: [{ payrollRun: { year: "desc" } }, { payrollRun: { month: "desc" } }],
          take: 12,
          select: { id: true, netSalary: true, paymentStatus: true, payrollRun: { select: { month: true, year: true, status: true } } },
        })
      : Promise.resolve([]),
    canViewPay ? listRecurringPay(id) : Promise.resolve([]),
  ]);
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
    {residency && <EmployeeResidencyPanel employeeId={id} residency={residency} canEdit={canEdit} />}
    {(await hasPermission("assets", "read")) && <EmployeeAssetsCard {...(await getEmployeeAssets(id))} own={false} canOpenAssets />}
    <EmployeeHandoversCard employeeId={id} items={await listEmployeeHandovers({ employeeId: id })} canStart={canEdit && (employee as { status?: string }).status !== "terminated"} />
    <EmployeeAccountCard
      account={account && linkedUserId ? { userId: linkedUserId, fullName: account.fullName, role: account.role, managerId: account.managerId, status: account.status, discountLimitPercent: account.discountLimitPercent, commissionRatePercent: account.commissionRatePercent } : null}
      email={account?.email ?? null}
      isSuperAdmin={account?.isSuperAdmin ?? false}
      roles={roleRows.map((r) => ({ id: r.id, name: r.nameEn, nameAr: r.nameAr })).map((r) => ({ id: r.id, name: r.name }))}
      managers={managerRows.map((m) => ({ id: m.id, name: m.fullName }))}
      requests={accountRequests as never}
      canManageUsers={canManageUsers}
      canEditEmployees={canEdit}
      canViewPay={canViewPay}
    />
    <LeaveBalancesCard balances={balances} year={year} employeeId={id} canAdjust={canEdit} />
    {canViewPay && <RecurringPayPanel employeeId={id} items={recurringPay} canEdit={canEditPay} />}
    {canViewPay && <EmployeePayHistory rows={payItems.map((p) => ({ id: p.id, month: p.payrollRun.month, year: p.payrollRun.year, netSalary: Number(p.netSalary), paymentStatus: p.paymentStatus, runStatus: p.payrollRun.status }))} />}
    <EmployeeAttachments employeeId={id} attachments={attachments} canEdit={canEdit} canDelete={await hasPermission("employees", "delete")} />
    {canManage && <SalaryDocumentsView embedded employeeId={id} availableMonths={availableMonths} decidableIds={decidableIds} documents={documents.map(item => ({ id: item.id, kind: item.kind, status: item.status, months: item.months as string[], createdAt: item.createdAt.toISOString(), reviewNotes: item.reviewNotes, languages: item.languages }))} />}
    </div>
  );
}
