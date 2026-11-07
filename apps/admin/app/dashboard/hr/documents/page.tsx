import { requirePagePermission } from "../../../../lib/auth";
import { SalaryDocumentsView } from "../../../../components/hr/SalaryDocumentsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/documents");

export const dynamic = "force-dynamic";

export default async function SalaryDocumentsPage() {
  const user = await requirePagePermission("self_service", "read");
  return (
    <SalaryDocumentsView
      availableMonths={[]}
      decidableIds={[]}
      showNoProfile
      documents={[]}
    />
  );
}
