import { requirePagePermission } from "../../../../../lib/auth";
import { getCompanySettings } from "@platform/database";
import { ClientProfileForm } from "../../../../../components/crm/ClientProfileForm";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("crm/customers/new");

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requirePagePermission("contacts", "write");
  const settings = await getCompanySettings();
  return <ClientProfileForm defaultPaymentTermsDays={settings?.payment_terms_days ?? 30} />;
}
