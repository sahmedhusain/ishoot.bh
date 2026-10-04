import { requirePermission } from "../../../lib/auth";
import { getAllServices } from "@ishoot/database";
import { ServicesManagementView } from "../../../components/services/ServicesManagementView";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requirePermission("settings", "read");
  const services = await getAllServices();

  return <ServicesManagementView initialServices={services} />;
}
