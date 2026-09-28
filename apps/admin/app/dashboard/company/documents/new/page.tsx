import { Metadata } from "next";
import { NewCompanyDocumentFormView } from "../../../../../components/company/NewCompanyDocumentFormView";

export const metadata: Metadata = {
  title: "New Legal Document | Company Registry",
};

export default function NewCompanyDocumentPage() {
  return <NewCompanyDocumentFormView />;
}
