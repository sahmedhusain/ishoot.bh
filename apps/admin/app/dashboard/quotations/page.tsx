import { requirePermission } from "../../../lib/auth";
import { listQuotations } from "@ishoot/database";
import { QuotationsListView } from "../../../components/quotations/QuotationsListView";

export const dynamic = "force-dynamic";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("quotations", "read");
  const query = await searchParams;
  const statusFilter = typeof query.status === "string" ? query.status : undefined;
  const search = typeof query.search === "string" ? query.search : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const { items: quotations, total } = await listQuotations({
    status: statusFilter,
    search,
    page,
    pageSize: 50,
  });

  return (
    <QuotationsListView
      initialQuotations={quotations as any}
      total={total}
    />
  );
}
