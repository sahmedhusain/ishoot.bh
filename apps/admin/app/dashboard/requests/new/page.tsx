import { requirePermission } from "../../../../lib/auth";
import { db, getCRMContacts, getAllServices } from "@ishoot/database";
import { NewRequestFormView } from "../../../../components/requests/NewRequestFormView";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  await requirePermission("requests", "write");

  const [users, contacts, services] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, department: true },
      orderBy: { fullName: "asc" },
    }),
    getCRMContacts().catch(() => []),
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
      contacts={contacts}
      services={services}
    />
  );
}
