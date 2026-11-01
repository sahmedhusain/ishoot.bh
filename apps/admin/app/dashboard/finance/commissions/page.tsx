import { getCurrentPermissions, requirePagePermission } from "../../../../lib/auth";
import { getCommissionStatement } from "@platform/database";
import { CommissionsView } from "../../../../components/sales/CommissionsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("finance/commissions");

export const dynamic = "force-dynamic";

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePagePermission("reports", "read");
  const [params, grants] = await Promise.all([searchParams, getCurrentPermissions()]);
  const current = new Date().toISOString().slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") && params.month! <= current ? params.month! : current;
  const rows = await getCommissionStatement(month);
  return <CommissionsView month={month} rows={rows} canRecord={grants["expenses:write"] === true} canSetRates={grants["users:write"] === true || grants["employees:edit"] === true} />;
}
