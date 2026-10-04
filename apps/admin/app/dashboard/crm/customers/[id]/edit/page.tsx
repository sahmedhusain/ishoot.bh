import { requirePermission } from "../../../../../../lib/auth";
import { getCRMContactById } from "@ishoot/database";
import { notFound } from "next/navigation";
import { CustomerEditFormView } from "../../../../../../components/crm/CustomerEditFormView";

export const dynamic = "force-dynamic";

interface CustomerEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerEditPage({
  params,
}: CustomerEditPageProps) {
  await requirePermission("contacts", "write");
  const { id } = await params;
  const contact = await getCRMContactById(id);

  if (!contact) {
    notFound();
  }

  return <CustomerEditFormView contact={contact} />;
}
