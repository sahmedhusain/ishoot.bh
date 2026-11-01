import { getSettlementRules, listFinalSettlements } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { SettlementsListView } from "../../../../components/settlements/SettlementsListView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/settlements");

export const dynamic = "force-dynamic";

/** Final settlements of leaving employees, and the leaving-indemnity and leave pay-out rules they follow. */
export default async function SettlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("payroll", "read");
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "all";
  const q = typeof query.q === "string" ? query.q : "";
  const [items, rules, canCreate, canEdit] = await Promise.all([
    listFinalSettlements({ status, q }),
    getSettlementRules(),
    hasPermission("payroll", "create"),
    hasPermission("payroll", "edit"),
  ]);
  return (
    <SettlementsListView
      items={items}
      rules={rules}
      status={status}
      q={q}
      canCreate={canCreate}
      canEdit={canEdit}
    />
  );
}
