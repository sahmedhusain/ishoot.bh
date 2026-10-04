import { requirePermission } from "../../../lib/auth";
import { getInvoicesPage, getInvoiceSummary, type ListParameters } from "@ishoot/database";
import { InvoicesListView } from "../../../components/invoices/InvoicesListView";
import { ListControls } from "../../../components/shared/ListControls";
export const dynamic = "force-dynamic";
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePermission("invoices", "read");
  const [result, finance] = await Promise.all([getInvoicesPage(await searchParams), getInvoiceSummary()]);
  return <><ListControls path="/dashboard/invoices" {...result} statuses={["draft", "sent", "partially_paid", "paid", "overdue", "void"]} exportDomain="invoices" /><InvoicesListView key={JSON.stringify(result.filters) + result.page} initialInvoices={result.items} finance={finance} /></>;
}
