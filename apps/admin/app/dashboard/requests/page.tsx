import { requirePermission } from "../../../lib/auth";
import * as React from "react";
import { getRequestsAndComplaints, getAllUsers } from "@ishoot/database";
import { RequestsManagementView } from "../../../components/requests/RequestsManagementView";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requirePermission("requests", "read");

  const [requests, users] = await Promise.all([
    getRequestsAndComplaints(),
    getAllUsers(),
  ]);

  const userList = users.map((u) => ({
    id: u.id,
    name: u.full_name,
    role: u.role,
    department: u.department,
  }));

  return <RequestsManagementView initialRequests={requests} users={userList} />;
}
