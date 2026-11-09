import { requireAuth } from "../../../../lib/auth";
import { getOrgChart } from "@platform/database";
import { OrgChartView } from "../../../../components/directory/OrgChartView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("directory/org");

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  await requireAuth();
  return <OrgChartView {...await getOrgChart()} />;
}
