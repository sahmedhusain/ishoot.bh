import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { listSuppliers, requireFeatureEnabled } from "@platform/database";
import { SuppliersView } from "../../../../components/procurement/SuppliersView";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("procurement", "read");
  await requireFeatureEnabled("procurement");
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : "";
  const [suppliers, canEdit] = await Promise.all([listSuppliers(search), hasPermission("procurement", "edit")]);
  return <SuppliersView suppliers={suppliers} search={search} canEdit={canEdit} />;
}
