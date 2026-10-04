import { requirePermission } from "../../../lib/auth";
import { getRequestsPage, db } from "@ishoot/database";
import { RequestsManagementView } from "../../../components/requests/RequestsManagementView";
export const dynamic = "force-dynamic";
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("requests", "read");
  const query = await searchParams;
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  const filters = {
    intent: value("intent"),
    team: value("team"),
    workflowStatus: value("workflowStatus"),
    search: value("search"),
  };
  const [result, users] = await Promise.all([
    getRequestsPage(
      filters,
      Math.max(1, Math.floor(Number(value("page"))) || 1),
    ),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true, department: true },
      orderBy: { fullName: "asc" },
    }),
  ]);
  const userList = users.map((user) => ({
    id: user.id,
    name: user.fullName,
    role: user.role,
    department: user.department,
  }));
  return (
    <RequestsManagementView
      key={JSON.stringify({ filters, page: result.page })}
      initialRequests={result.items}
      users={userList}
      filters={filters}
      page={result.page}
      total={result.total}
      stats={result.stats}
    />
  );
}
