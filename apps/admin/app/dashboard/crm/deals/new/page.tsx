import { requirePermission } from "../../../../../lib/auth";
import { Metadata } from "next";
import { NewDealFormView } from "../../../../../components/crm/NewDealFormView";

export const metadata: Metadata = {
  title: "New Deal | CRM",
};

export default async function NewDealPage() {
  await requirePermission("deals", "write");
  return <NewDealFormView />;
}
