import { Metadata } from "next";
import { NewDealFormView } from "../../../../../components/crm/NewDealFormView";

export const metadata: Metadata = {
  title: "New Deal | CRM",
};

export default function NewDealPage() {
  return <NewDealFormView />;
}
