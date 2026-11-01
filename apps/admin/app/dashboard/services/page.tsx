import { requirePagePermission } from "../../../lib/auth";
import { getAllServices, getCompanySettings } from "@platform/database";
import { ServicesManagementView } from "../../../components/services/ServicesManagementView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("services");

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requirePagePermission("invoices", "read");
  const [services, company] = await Promise.all([getAllServices(), getCompanySettings()]);

  return <ServicesManagementView initialServices={services} languages={company.content_languages} />;
}
