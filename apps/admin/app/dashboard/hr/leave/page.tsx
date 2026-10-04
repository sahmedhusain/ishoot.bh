import { requireAuth, hasPermission } from "../../../../lib/auth";
import { listLeaveRequests, listLeaveTypes, listEmployees, db } from "@ishoot/database";
import { LeaveManagementView } from "../../../../components/hr/LeaveManagementView";

export const dynamic = "force-dynamic";

export default async function LeaveManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "all";
  const employeeId = typeof query.employeeId === "string" ? query.employeeId : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const canReadTeam = await hasPermission("employees", "read");
  const canCreateTeam = await hasPermission("employees", "create");
  const canApprove = await hasPermission("employees", "approve");
  const ownEmployee = await db.employee.findUnique({ where: { userId: user.id }, select: { id: true } });
  const [
    { items: requests, total },
    leaveTypes,
    myEmployee,
    allEmployeesResult,
  ] = await Promise.all([
    listLeaveRequests({
      status: status === "all" ? undefined : status,
      employeeId: canReadTeam ? employeeId : ownEmployee?.id || "no-employee",
      page,
      pageSize: 30,
    }),
    listLeaveTypes(),
    db.employee.findFirst({
      where: { userId: user.id },
      include: { department: true },
    }),
    canCreateTeam ? listEmployees({ pageSize: 100 }) : Promise.resolve({ items: [], total: 0 }),
  ]);

  const isManagerOrAdmin = canApprove;

  return (
    <LeaveManagementView
      requests={requests}
      leaveTypes={leaveTypes}
      allEmployees={allEmployeesResult.items}
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
      isManagerOrAdmin={isManagerOrAdmin}
      currentStatus={status}
      total={total}
      page={page}
    />
  );
}
