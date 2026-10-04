import { requirePermission } from "../../../../lib/auth";
import { getAllClientLogos } from "@ishoot/database";
import { ClientsManagementView } from "../../../../components/cms/ClientsManagementView";

export const dynamic = "force-dynamic";

export default async function ClientLogosManagerPage() {
  await requirePermission("clients", "read");
  const logos = await getAllClientLogos();

  return <ClientsManagementView initialLogos={logos} />;
}
