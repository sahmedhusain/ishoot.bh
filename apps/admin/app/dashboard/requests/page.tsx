import { getRequestList } from "@ishoot/database";
import { REQUEST_KINDS, type RequestKind } from "@ishoot/database/constants/requests";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { RequestsInboxView } from "../../../components/requests/RequestsInboxView";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePagePermission("requests", "read");
  const query = await searchParams;
  const value = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const kind: RequestKind | "all" = (REQUEST_KINDS as readonly string[]).includes(value("kind")) ? (value("kind") as RequestKind) : "all";
  const scope: "all" | "mine" | "unassigned" = value("scope") === "mine" || value("scope") === "unassigned" ? value("scope") as "mine" | "unassigned" : "all";
  const filters = {
    kind,
    status: value("status") || "open",
    scope,
    team: value("team") || "all",
    priority: value("priority") || "all",
    overdue: value("overdue") === "true",
    search: value("search"),
  };
  const [result, canCreate] = await Promise.all([
    getRequestList(filters, user.id, Math.max(1, Math.floor(Number(value("page"))) || 1)),
    hasPermission("requests", "write"),
  ]);
  return (
    <RequestsInboxView
      rows={result.items}
      total={result.total}
      page={result.page}
      stats={result.stats}
      filters={filters}
      canCreate={canCreate}
    />
  );
}
