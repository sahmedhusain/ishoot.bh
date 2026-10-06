import { ROUTES } from "../../../constants/routes";
import { requirePagePermission } from "../../../lib/auth";
import {
  getInvoicesPage,
  getInvoiceSummary,
  getAcceptedQuotationsUninvoiced,
  type ListParameters,
} from "@ishoot/database";
import { InvoicesListView } from "../../../components/invoices/InvoicesListView";
import { ListControls } from "../../../components/shared/ListControls";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<ListParameters>;
}) {
  await requirePagePermission("invoices", "read");
  const [result, finance, acceptedQuotations] = await Promise.all([
    getInvoicesPage(await searchParams),
    getInvoiceSummary(),
    getAcceptedQuotationsUninvoiced(),
  ]);

  return (
    <>
      <ListControls
        path={ROUTES.invoices.list}
        {...result}
        statuses={["draft", "sent", "partially_paid", "paid", "overdue", "void"]}
        exportDomain="invoices"
      />
      <InvoicesListView
        key={JSON.stringify(result.filters) + result.page}
        initialInvoices={result.items}
        finance={finance}
        acceptedQuotations={acceptedQuotations}
      />
    </>
  );
}
