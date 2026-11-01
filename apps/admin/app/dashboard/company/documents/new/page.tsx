import { requirePagePermission } from "../../../../../lib/auth";
import { NewCompanyDocumentFormView } from "../../../../../components/company/NewCompanyDocumentFormView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("company/documents/new");

export default async function NewCompanyDocumentPage() {
  await requirePagePermission("settings", "write");
  return <NewCompanyDocumentFormView />;
}
