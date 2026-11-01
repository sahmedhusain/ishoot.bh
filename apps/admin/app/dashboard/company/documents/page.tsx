import { requirePagePermission } from "../../../../lib/auth";
import { getCompanyDocuments } from "@platform/database";
import { CompanyDocumentsClientView } from "../../../../components/company/CompanyDocumentsClientView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("company/documents");

export default async function CompanyDocumentsPage() {
  await requirePagePermission("settings", "read");
  const documents = await getCompanyDocuments();

  return <CompanyDocumentsClientView initialDocuments={documents} />;
}
