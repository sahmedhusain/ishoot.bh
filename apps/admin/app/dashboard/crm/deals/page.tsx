import { ROUTES } from "../../../../constants/routes";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getActiveDealStages, getDealsPage, type ListParameters } from "@platform/database";
import { KanbanBoard } from "../../../../components/crm/KanbanBoard";
import { ListControls } from "../../../../components/shared/ListControls";
import { dataScope } from "../../../../lib/data-scope";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("crm/deals");

export const dynamic = "force-dynamic";
export default async function DealsPipelinePage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePagePermission("deals", "read");
  const [result, stages, canCustomize] = await Promise.all([getDealsPage(await searchParams, undefined, await dataScope("deals")), getActiveDealStages(), hasPermission("settings", "edit")]);
  return <KanbanBoard key={JSON.stringify(result.filters) + result.page} initialDeals={result.items} stages={stages} canCustomize={canCustomize} controls={<ListControls path={ROUTES.crm.deals} {...result} statuses={stages.map((stage) => stage.id)} statusNames={Object.fromEntries(stages.map((stage) => [stage.id, { en: stage.name_en, ar: stage.name_ar }]))} exportDomain="deals" />} />;
}
