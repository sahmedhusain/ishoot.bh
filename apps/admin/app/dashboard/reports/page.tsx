import { requireAuth } from "../../../lib/auth";
import { reportsForUser } from "../../../lib/reports";
import { ReportsCatalogView } from "../../../components/reports/ReportsCatalogView";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireAuth();
  const reports = await reportsForUser(user.id);
  return <ReportsCatalogView reports={reports.map((r) => ({ key: r.key, area: r.area }))} />;
}
