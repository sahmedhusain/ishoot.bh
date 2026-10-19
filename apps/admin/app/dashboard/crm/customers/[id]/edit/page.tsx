import { requirePagePermission } from "../../../../../../lib/auth";
import { getClientProfile, getCompanySettings } from "@platform/database";
import { notFound } from "next/navigation";
import { ClientProfileForm } from "../../../../../../components/crm/ClientProfileForm";

export const dynamic = "force-dynamic";

export default async function CustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("contacts", "write");
  const { id } = await params;
  const [contact, settings] = await Promise.all([getClientProfile(id), getCompanySettings()]);
  if (!contact) notFound();
  return <ClientProfileForm contact={contact} defaultPaymentTermsDays={settings?.payment_terms_days ?? 30} />;
}
