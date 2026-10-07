import { db, listEmployeeHandovers } from "@ishoot/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { HandoversListView } from "../../../../components/handovers/HandoversListView";

export const dynamic = "force-dynamic";

export default async function EmployeeHandoversPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("employees", "read");
  const query = await searchParams;
  const pick = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : undefined);
  const status = pick("status") ?? "active";
  const kind = pick("kind") ?? "all";
  const [all, employees, canEdit] = await Promise.all([
    listEmployeeHandovers({ kind, status: status === "active" ? undefined : status }),
    db.employee.findMany({ where: { status: { not: "terminated" } }, select: { id: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true }, orderBy: { firstNameEn: "asc" } }),
    hasPermission("employees", "edit"),
  ]);
  const items = status === "active" ? all.filter((h) => h.status === "open" || h.status === "pending_approval") : all;
  return (
    <HandoversListView
      items={items}
      status={status}
      kind={kind}
      startFor={pick("employeeId")}
      employees={employees.map((e) => ({ id: e.id, name_en: `${e.firstNameEn} ${e.lastNameEn}`, name_ar: `${e.firstNameAr} ${e.lastNameAr}` }))}
      canEdit={canEdit}
    />
  );
}
