import { SalaryDocumentsView } from "../../../components/hr/SalaryDocumentsView";
import { requireAuth } from "../../../lib/auth";
import {
  db,
  getProfileChangeRequestsForUser,
  getPendingProfileChangesForManager,
} from "@ishoot/database";
import { UserProfileView } from "../../../components/profile/UserProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAuth();

  const [manager, employeeRecord, myRequests, pendingTeamRequests] =
    await Promise.all([
      user.manager_id
        ? db.user
            .findUnique({
              where: { id: user.manager_id },
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            })
            .catch(() => null)
        : Promise.resolve(null),
      db.employee
        .findFirst({
          where: { userId: user.id },
          include: { department: true },
        })
        .catch(() => null),
      getProfileChangeRequestsForUser(user.id).catch(() => []),
      ["super_admin", "admin", "production_manager", "finance_manager"].includes(
        user.role,
      )
        ? getPendingProfileChangesForManager(user.id).catch(() => [])
        : Promise.resolve([]),
    ]);

  const salaryDocuments = employeeRecord ? await db.salaryDocument.findMany({ where: { employeeId: employeeRecord.id }, orderBy: { createdAt: "desc" } }) : [];
  return (
    <div className="space-y-6">
    <UserProfileView
      user={user}
      manager={manager}
      employeeRecord={employeeRecord}
      myRequests={myRequests}
      pendingTeamRequests={pendingTeamRequests}
    />
    {employeeRecord && <SalaryDocumentsView employeeId={employeeRecord.id} documents={salaryDocuments.map(item => ({ id: item.id, kind: item.kind, status: item.status, months: item.months as string[], createdAt: item.createdAt.toISOString(), reviewNotes: item.reviewNotes }))} />}
    </div>
  );
}
