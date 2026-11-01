import { requireAuth } from "../../../lib/auth";
import { reportsForUser } from "../../../lib/reports";
import { ReportsCatalogView } from "../../../components/reports/ReportsCatalogView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("reports");

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireAuth();
  const reports = await reportsForUser(user.id);
  return <ReportsCatalogView reports={reports.map((r) => ({ key: r.key, area: r.area }))} />;
}
