import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getConsolidatedRequestById, db, findPendingApproval, canDecideApproval } from "@platform/database";
import { RequestDetailView } from "../../../../components/requests/RequestDetailView";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requirePagePermission("requests", "read");
  const { id } = await params;

  const [request, users, pendingApproval, leadsWrite, contactsWrite, dealsWrite] = await Promise.all([
    getConsolidatedRequestById(id),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, department: true },
      orderBy: { fullName: "asc" },
    }),
    findPendingApproval("service_request", id),
    hasPermission("leads", "write"),
    hasPermission("contacts", "write"),
    hasPermission("deals", "write"),
  ]);

  if (!request) {
    notFound();
  }

  const userList = users.map((u) => ({
    id: u.id,
    name: u.fullName,
    role: u.role,
    department: u.department,
  }));

  return (
    <RequestDetailView
      request={request}
      users={userList}
      currentUserId={currentUser.id}
      canDecideApproval={!!pendingApproval && canDecideApproval(pendingApproval, currentUser)}
      canSell={leadsWrite && contactsWrite && dealsWrite}
    />
  );
}
