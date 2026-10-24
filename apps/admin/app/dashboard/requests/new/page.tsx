import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { db, getAllServices, getFeatureToggle } from "@platform/database";
import { NewRequestFormView } from "../../../../components/requests/NewRequestFormView";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  await requirePagePermission("requests", "write");

  const [users, canReadContacts, crmFeature, services] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, department: true },
      orderBy: { fullName: "asc" },
    }),
    hasPermission("contacts", "read"),
    getFeatureToggle("crm_deals"),
    getAllServices({ isActive: true }).catch(() => []),
  ]);

  const userList = users.map((u) => ({
    id: u.id,
    name: u.fullName,
    role: u.role,
    department: u.department,
  }));

  return (
    <NewRequestFormView
      users={userList}
      canPickContact={canReadContacts && crmFeature?.isEnabled !== false}
      services={services}
    />
  );
}
