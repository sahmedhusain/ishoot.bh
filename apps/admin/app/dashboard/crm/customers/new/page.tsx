import { requirePagePermission } from "../../../../../lib/auth";
import { getCompanySettings } from "@ishoot/database";
import { ClientProfileForm } from "../../../../../components/crm/ClientProfileForm";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requirePagePermission("contacts", "write");
  const settings = await getCompanySettings();
  return <ClientProfileForm defaultPaymentTermsDays={settings?.payment_terms_days ?? 30} />;
}
