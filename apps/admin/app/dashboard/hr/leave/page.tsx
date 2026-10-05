import { requirePermission, hasPermission } from "../../../../lib/auth";
import { listLeaveRequests, listLeaveTypes, listEmployees, db, canDecideApproval } from "@ishoot/database";
import { LeaveManagementView } from "../../../../components/hr/LeaveManagementView";

export const dynamic = "force-dynamic";

export default async function LeaveManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Leave is self-service: every staff member with self_service:read can file and follow their own.
  const user = await requirePermission("self_service", "read");
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "all";
  const employeeId = typeof query.employeeId === "string" ? query.employeeId : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const [canReadTeam, canFileForOthers, myEmployee, awaitingMe] = await Promise.all([
    hasPermission("employees", "read"),
    hasPermission("employees", "create"),
    db.employee.findFirst({ where: { userId: user.id }, include: { department: true } }),
    // Line managers see their reports' requests even without team-wide HR access.
    db.approvalRequest.findMany({
      where: { targetType: "leave_request", status: "pending", approverIds: { has: user.id } },
      select: { targetId: true },
    }),
  ]);

  const [{ items: requests, total }, leaveTypes, allEmployeesResult] = await Promise.all([
    listLeaveRequests({
      status: status === "all" ? undefined : status,
      employeeId: canReadTeam ? employeeId : myEmployee?.id || "no-employee",
      includeIds: canReadTeam ? undefined : awaitingMe.map((a) => a.targetId),
      page,
      pageSize: 30,
    }),
    listLeaveTypes(),
    canFileForOthers ? listEmployees({ pageSize: 100 }) : Promise.resolve({ items: [], total: 0 }),
  ]);

  const pendingIds = requests.filter((r) => r.status === "pending").map((r) => r.id);
  const pendingApprovals = pendingIds.length
    ? await db.approvalRequest.findMany({
        where: { targetType: "leave_request", targetId: { in: pendingIds }, status: "pending" },
        select: { targetId: true, status: true, requestedById: true, approverIds: true },
      })
    : [];
  const decidableIds = pendingApprovals.filter((a) => canDecideApproval(a, user)).map((a) => a.targetId);

  return (
    <LeaveManagementView
      requests={requests}
      leaveTypes={leaveTypes}
      // Only names are needed to file for someone else; salaries never leave the server here.
      allEmployees={allEmployeesResult.items.map((e) => ({ ...e, employmentRecords: [] }))}
      myEmployee={
        myEmployee
          ? {
              ...myEmployee,
              leaveBalanceDays: Number(myEmployee.leaveBalanceDays),
              hireDate: myEmployee.hireDate.toISOString(),
              createdAt: myEmployee.createdAt.toISOString(),
              updatedAt: myEmployee.updatedAt.toISOString(),
            }
          : null
      }
      currentUserId={user.id}
      canFileForOthers={canFileForOthers}
      decidableIds={decidableIds}
      currentStatus={status}
      total={total}
      page={page}
    />
  );
}
