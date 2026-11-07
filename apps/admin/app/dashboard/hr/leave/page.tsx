import { requirePagePermission } from "../../../../lib/auth";
import { listLeaveRequests, listLeaveTypes, canDecideApproval, getLeaveBalances } from "@platform/database";
import { LeaveManagementView } from "../../../../components/hr/LeaveManagementView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/leave");

export const dynamic = "force-dynamic";

export default async function LeaveManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Leave is self-service: every staff member with self_service:read can file and follow their own.
  const user = await requirePagePermission("self_service", "read");
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "all";
  const page = Math.max(1, Number(query.page) || 1);

  // This page is "my leave" for everyone, Super Admin and HR included. Other people's requests live in
  // HR Requests (all requests, and filing on someone's behalf) and the Approvals Center (deciding).
  const canFileForOthers = false;
  const myEmployee = null;

  const [{ items: requests, total }, leaveTypes, myBalances] = await Promise.all([
    listLeaveRequests({
      status: status === "all" ? undefined : status,
      employeeId: "no-employee",
      page,
      pageSize: 30,
    }),
    listLeaveTypes(),
    Promise.resolve([]),
  ]);

  const decidableIds: string[] = [];

  return (
    <LeaveManagementView
      requests={requests}
      leaveTypes={leaveTypes}
      myBalances={myBalances}
      // Only names are needed to file for someone else; salaries never leave the server here.
      allEmployees={[]}
      myEmployee={null}
      currentUserId={user.id}
      canFileForOthers={canFileForOthers}
      decidableIds={decidableIds}
      currentStatus={status}
      total={total}
      page={page}
    />
  );
}
