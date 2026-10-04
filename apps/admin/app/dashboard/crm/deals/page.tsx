import { requirePermission } from "../../../../lib/auth";
import { getDealsPage, type ListParameters } from "@ishoot/database";
import { KanbanBoard } from "../../../../components/crm/KanbanBoard";
import { ListControls } from "../../../../components/shared/ListControls";
export const dynamic = "force-dynamic";
export default async function DealsPipelinePage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePermission("deals", "read");
  const result = await getDealsPage(await searchParams);
  return <><ListControls path="/dashboard/crm/deals" {...result} statuses={["lead", "proposal_sent", "contract_signed", "production", "post_production", "delivered", "invoiced", "closed_won", "closed_lost"]} exportDomain="deals" /><KanbanBoard key={JSON.stringify(result.filters) + result.page} initialDeals={result.items} /></>;
}
