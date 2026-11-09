import { listEmployees, listLeaveTypes } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { canManageSalaryDocuments } from "../../../../lib/salary-documents";
import { ROUTES } from "../../../../constants/routes";
import { HrRequestsView, type HrRequestRow } from "../../../../components/hr/HrRequestsView";
import { dataScope } from "../../../../lib/data-scope";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/requests");

export const dynamic = "force-dynamic";

const TYPES = ["all", "leave", "salary_document", "claim"] as const;
const STATUSES = ["all", "pending", "approved", "rejected", "cancelled", "issued", "paid"];
const TAKE = 100;

const nameOf = (e: { firstNameEn: string; lastNameEn: string; firstNameAr: string; lastNameAr: string }) => ({
  en: `${e.firstNameEn} ${e.lastNameEn}`.trim(),
  ar: `${e.firstNameAr} ${e.lastNameAr}`.trim(),
});

export default async function HrRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; employeeId?: string }>;
}) {
  const user = await requirePagePermission("employees", "read");
  const params = await searchParams;
  const type = (TYPES as readonly string[]).includes(params.type ?? "") ? params.type! : "all";
  const status = STATUSES.includes(params.status ?? "") ? params.status! : "all";
  const employeeId = params.employeeId || undefined;

  const [canFile, canIssueDocuments, employeesResult, leaveTypes] = await Promise.all([
    hasPermission("employees", "create"),
    canManageSalaryDocuments(user),
    listEmployees({ pageSize: 500 }),
    listLeaveTypes(),
  ]);

  const leave: any[] = [];
  const docs: any[] = [];
  const claims: any[] = [];

  const rows: HrRequestRow[] = [
    ...leave.map((r) => ({
      key: `leave:${r.id}`,
      type: "leave" as const,
      reference: r.employee.employeeNumber,
      employee: nameOf(r.employee),
      summaryEn: r.leaveType.nameEn,
      summaryAr: r.leaveType.nameAr,
      detail: `${r.startDate.toISOString().slice(0, 10)} → ${r.endDate.toISOString().slice(0, 10)}`,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      href: ROUTES.hr.leave({ highlight: r.id }),
    })),
    ...docs.map((d) => ({
      key: `doc:${d.id}`,
      type: "salary_document" as const,
      reference: d.employee.employeeNumber,
      employee: nameOf(d.employee),
      summaryEn: d.kind,
      summaryAr: d.kind,
      detail: d.kind === "payslip" ? (d.months as string[]).join(", ") : "",
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      href: ROUTES.hr.documents({ highlight: d.id }),
    })),
    ...claims.map((c) => ({
      key: `claim:${c.id}`,
      type: "claim" as const,
      reference: c.claimNumber,
      employee: {
        en: c.claimant.fullName,
        ar: c.claimant.employee ? `${c.claimant.employee.firstNameAr} ${c.claimant.employee.lastNameAr}`.trim() : c.claimant.fullName,
      },
      summaryEn: c.reason,
      summaryAr: c.reason,
      detail: `${Number(c.amount).toFixed(3)} ${c.currency}`,
      status: c.status === "submitted" ? "pending" : c.status,
      createdAt: c.createdAt.toISOString(),
      href: ROUTES.claims.list({ view: "finance", highlight: c.id }),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, TAKE);

  return (
    <HrRequestsView
      rows={rows}
      type={type}
      status={status}
      employeeId={employeeId ?? ""}
      canFile={canFile}
      canFileDocuments={canIssueDocuments}
      employees={employeesResult.items.map((e) => ({
        id: e.id,
        number: e.employeeNumber,
        nameEn: `${e.firstNameEn} ${e.lastNameEn}`.trim(),
        nameAr: `${e.firstNameAr} ${e.lastNameAr}`.trim(),
      }))}
      leaveTypes={leaveTypes.map((lt) => ({ id: lt.id, nameEn: lt.nameEn, nameAr: lt.nameAr }))}
    />
  );
}
