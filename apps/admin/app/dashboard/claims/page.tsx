import { getCurrentPermissions, requirePagePermission } from "../../../lib/auth";
import { getExpenseCategories, listExpenseClaims } from "@platform/database";
import { ClaimsView } from "../../../components/claims/ClaimsView";
import { dataScope } from "../../../lib/data-scope";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "submitted", "approved", "scheduled", "paid", "rejected", "cancelled"];

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; highlight?: string }> }) {
  const user = await requirePagePermission("self_service", "read");
  const [params, grants] = await Promise.all([searchParams, getCurrentPermissions()]);
  const canProcess = grants["expenses:write"] === true;
  const view = canProcess && params.view === "finance" ? "finance" : "mine";
  const status = STATUSES.includes(params.status ?? "") ? params.status! : view === "finance" ? "approved" : "all";
  const [data, categories] = await Promise.all([
    listExpenseClaims({ claimantId: view === "mine" ? user.id : undefined, claimantIds: view === "mine" ? null : await dataScope("claims"), status }),
    canProcess ? getExpenseCategories() : Promise.resolve([]),
  ]);
  return (
    <ClaimsView
      view={view}
      status={status}
      data={data}
      canProcess={canProcess}
      currentUserId={user.id}
      categories={categories}
      highlight={params.highlight}
    />
  );
}
