import { getRequestList } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { REQUEST_DUE_FILTERS, REQUEST_KINDS, REQUEST_SORTS, REQUEST_SOURCES, type RequestKind } from "@platform/database/constants/requests";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { RequestsInboxView } from "../../../components/requests/RequestsInboxView";
import { dataScope } from "../../../lib/data-scope";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("requests");

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePagePermission("requests", "read");
  const query = await searchParams;
  const value = (key: string) => (typeof query[key] === "string" ? (query[key] as string).slice(0, 200) : "");
  const oneOf = (key: string, list: readonly string[], fallback = "all") => (list.includes(value(key)) ? value(key) : fallback);
  const date = (key: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value(key)) ? value(key) : "");
  const kind: RequestKind | "all" = (REQUEST_KINDS as readonly string[]).includes(value("kind")) ? (value("kind") as RequestKind) : "all";
  const scope: "all" | "mine" | "unassigned" = value("scope") === "mine" || value("scope") === "unassigned" ? value("scope") as "mine" | "unassigned" : "all";
  const filters = {
    kind,
    status: value("status") || "open",
    scope,
    team: value("team") || "all",
    priority: value("priority") || "all",
    // Old links used overdue=true.
    due: value("overdue") === "true" ? "overdue" : oneOf("due", REQUEST_DUE_FILTERS),
    assignee: value("assignee") || "all",
    source: oneOf("source", REQUEST_SOURCES),
    customerId: value("customerId"),
    from: date("from"),
    to: date("to"),
    search: value("search"),
    sort: oneOf("sort", REQUEST_SORTS, "urgency"),
  };
  const [result, canCreate, canExport, staff] = await Promise.all([
    getRequestList(filters, user.id, Math.max(1, Math.floor(Number(value("page"))) || 1), await dataScope("requests")),
    hasPermission("requests", "write"),
    hasPermission("requests", "export"),
    listEmployees().catch(() => []),
  ]);
  return (
    <RequestsInboxView
      rows={result.items}
      total={result.total}
      page={result.page}
      stats={result.stats}
      filters={filters}
      canCreate={canCreate}
      canExport={canExport}
      staff={staff.map((s) => ({ id: s.id, name: `${s.first_name_en || ""} ${s.last_name_en || ""}`.trim() || s.id }))}
    />
  );
}
