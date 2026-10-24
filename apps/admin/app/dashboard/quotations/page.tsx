import { requirePagePermission } from "../../../lib/auth";
import { getQuotationListSummary, listQuotations } from "@platform/database";
import { QUOTATION_STATUSES } from "@platform/database/constants/finance";
import { QuotationsListView, type QuotationListItem } from "../../../components/quotations/QuotationsListView";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("quotations", "read");
  const query = await searchParams;
  const rawStatus = typeof query.status === "string" ? query.status : "all";
  const status = (QUOTATION_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "all";
  const search = (typeof query.q === "string" ? query.q : typeof query.search === "string" ? query.search : "").trim();
  const page = Math.max(1, Number(query.page) || 1);

  const [{ items, total }, summary] = await Promise.all([
    listQuotations({
      status: status === "all" ? undefined : status,
      search: search || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getQuotationListSummary(),
  ]);

  return (
    <QuotationsListView
      quotations={items as QuotationListItem[]}
      summary={summary}
      pagination={{ page, total, filters: { q: search, status } }}
    />
  );
}
