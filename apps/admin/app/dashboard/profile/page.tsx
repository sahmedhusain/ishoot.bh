import { SalaryDocumentsView } from "../../../components/hr/SalaryDocumentsView";
import { availablePayslipMonths } from "../../../lib/salary-documents";
import { requireAuth } from "../../../lib/auth";
import {
  db,
  getProfileChangeRequestsForUser,
  getPendingProfileChangesForManager,
  canDecideApproval,
} from "@ishoot/database";
import { UserProfileView } from "../../../components/profile/UserProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAuth();

  const [manager, employeeRecord, myRequests, teamRequests] =
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
      // Returns only changes filed by this user's direct reports; empty for non-managers.
      getPendingProfileChangesForManager(user.id).catch(() => []),
    ]);

  // Show approve/reject only where the approval policy actually lets this user decide.
  const teamApprovals = teamRequests.length
    ? await db.approvalRequest.findMany({
        where: { targetType: "profile_change", status: "pending", targetId: { in: teamRequests.map((r: { id: string }) => r.id) } },
        select: { targetId: true, status: true, requestedById: true, approverIds: true },
      })
    : [];
  const decidable = new Set(teamApprovals.filter((a) => canDecideApproval(a, user)).map((a) => a.targetId));
  const pendingTeamRequests = teamRequests.filter((r: { id: string }) => decidable.has(r.id));

  const [salaryDocuments, availableMonths] = employeeRecord
    ? await Promise.all([
        db.salaryDocument.findMany({ where: { employeeId: employeeRecord.id }, orderBy: { createdAt: "desc" } }),
        availablePayslipMonths(employeeRecord.id),
      ])
    : [[], []];
  return (
    <div className="space-y-6">
    <UserProfileView
      user={user}
      manager={manager}
      employeeRecord={employeeRecord}
      myRequests={myRequests}
      pendingTeamRequests={pendingTeamRequests}
    />
    <SalaryDocumentsView showNoProfile employeeId={employeeRecord?.id} availableMonths={availableMonths} documents={salaryDocuments.map(item => ({ id: item.id, kind: item.kind, status: item.status, months: item.months as string[], createdAt: item.createdAt.toISOString(), reviewNotes: item.reviewNotes }))} />
    </div>
  );
}
