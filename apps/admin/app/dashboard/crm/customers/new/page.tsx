import { requirePermission } from "../../../../../lib/auth";
import { Metadata } from "next";
import { NewCustomerFormView } from "../../../../../components/crm/NewCustomerFormView";

export const metadata: Metadata = {
  title: "New Customer | CRM",
};

export default async function NewCustomerPage() {
  await requirePermission("contacts", "write");
  return <NewCustomerFormView />;
}
