import { listEmployeeHandovers } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { HandoversListView } from "../../../../components/handovers/HandoversListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/handovers");

export const dynamic = "force-dynamic";

export default async function EmployeeHandoversPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("employees", "read");
  const query = await searchParams;
  const pick = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : undefined);
  const status = pick("status") ?? "active";
  const kind = pick("kind") ?? "all";
  const [all, rawEmployees, canEdit] = await Promise.all([
    listEmployeeHandovers({ kind, status: status === "active" ? undefined : status }),
    listEmployees().catch(() => []),
    hasPermission("employees", "edit"),
  ]);
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    name_en: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
    name_ar: `${e.first_name_ar || e.first_name_en || ""} ${e.last_name_ar || e.last_name_en || ""}`.trim() || e.id,
  }));
  const items = status === "active" ? all.filter((h) => h.status === "open" || h.status === "pending_approval") : all;
  return (
    <HandoversListView
      items={items}
      status={status}
      kind={kind}
      startFor={pick("employeeId")}
      employees={employees}
      canEdit={canEdit}
    />
  );
}
