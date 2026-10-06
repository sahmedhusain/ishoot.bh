import { requirePagePermission } from "../../../../../lib/auth";
import { Metadata } from "next";
import { NewCustomerFormView } from "../../../../../components/crm/NewCustomerFormView";

export const metadata: Metadata = {
  title: "New Customer | CRM",
};

export default async function NewCustomerPage() {
  await requirePagePermission("contacts", "write");
  return <NewCustomerFormView />;
}
