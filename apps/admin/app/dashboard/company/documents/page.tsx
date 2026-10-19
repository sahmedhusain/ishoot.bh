import { requirePagePermission } from "../../../../lib/auth";
import { getCompanyDocuments } from "@platform/database";
import { CompanyDocumentsClientView } from "../../../../components/company/CompanyDocumentsClientView";

export default async function CompanyDocumentsPage() {
  await requirePagePermission("settings", "read");
  const documents = await getCompanyDocuments();

  return <CompanyDocumentsClientView initialDocuments={documents} />;
}
