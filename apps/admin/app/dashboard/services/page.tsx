import { requirePagePermission } from "../../../lib/auth";
import { getAllServices } from "@platform/database";
import { ServicesManagementView } from "../../../components/services/ServicesManagementView";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requirePagePermission("invoices", "read");
  const services = await getAllServices();

  return <ServicesManagementView initialServices={services} />;
}
