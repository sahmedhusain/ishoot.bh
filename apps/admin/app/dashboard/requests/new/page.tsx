import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getAllServices, getFeatureToggle } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { NewRequestFormView } from "../../../../components/requests/NewRequestFormView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("requests/new");

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  await requirePagePermission("requests", "write");

  const [rawEmployees, canReadContacts, crmFeature, services] = await Promise.all([
    listEmployees().catch(() => []),
    hasPermission("contacts", "read"),
    getFeatureToggle("crm_deals"),
    getAllServices({ isActive: true }).catch(() => []),
  ]);

  const userList = rawEmployees.map((u) => ({
    id: u.id,
    name: `${u.first_name_en || ""} ${u.last_name_en || ""}`.trim() || u.id,
    role: u.job_title_en || "Staff",
    department: null,
  }));

  return (
    <NewRequestFormView
      users={userList}
      canPickContact={canReadContacts && crmFeature?.isEnabled !== false}
      services={services}
    />
  );
}
