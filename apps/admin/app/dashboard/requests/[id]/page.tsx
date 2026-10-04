import { notFound } from "next/navigation";
import { requirePermission, getCurrentUser } from "../../../../lib/auth";
import { getConsolidatedRequestById, db } from "@ishoot/database";
import { RequestDetailView } from "../../../../components/requests/RequestDetailView";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("requests", "read");
  const { id } = await params;

  const [request, users, currentUser] = await Promise.all([
    getConsolidatedRequestById(id),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, department: true },
      orderBy: { fullName: "asc" },
    }),
    getCurrentUser(),
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
      currentUserId={currentUser?.id || ""}
      currentUserRole={currentUser?.role || "viewer"}
    />
  );
}
