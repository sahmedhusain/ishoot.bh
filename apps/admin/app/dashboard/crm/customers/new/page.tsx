import { Metadata } from "next";
import { NewCustomerFormView } from "../../../../../components/crm/NewCustomerFormView";

export const metadata: Metadata = {
  title: "New Customer | CRM",
};

export default function NewCustomerPage() {
  return <NewCustomerFormView />;
}
