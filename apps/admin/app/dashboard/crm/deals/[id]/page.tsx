import {
getCurrentPermissions,
requirePagePermission,
} from "../../../../../lib/auth";
import {
getCRMDealById,
getCRMContactById,
getInvoicesPage,
getRelatedExpenses,
} from "@platform/database";
import { RelatedExpensesPanel } from "../../../../../components/expenses/RelatedExpensesPanel";
import { notFound } from "next/navigation";
import { DealDossierView } from "../../../../../components/crm/DealDossierView";

export const dynamic = "force-dynamic";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function DealDetailPage({
  params,
  searchParams,
}: DealDetailPageProps) {
  await requirePagePermission("deals", "read");
  const { id } = await params;
  const deal = await getCRMDealById(id);

  if (!deal) {
    notFound();
  }

  const grants = await getCurrentPermissions();
  const canContacts = grants["contacts:read"] === true;
  const canInvoices = grants["invoices:read"] === true;
  if (!canContacts) deal.contact = undefined;
  const [contact, invoices, expenses] = await Promise.all([
    canContacts && deal.contact_id
      ? getCRMContactById(deal.contact_id)
      : Promise.resolve(null),
    canInvoices
      ? getInvoicesPage({ ...(await searchParams), dealId: id })
      : Promise.resolve(null),
    grants["expenses:read"] === true ? getRelatedExpenses({ dealId: id }) : Promise.resolve(null),
  ]);

  return (
    <>
    <DealDossierView
      deal={deal}
      contact={contact}
      invoices={invoices?.items || []}
      invoicePage={invoices || undefined}
      actions={{
        createQuotation: canContacts && grants["quotations:create"] === true,
        createInvoice: canContacts && grants["invoices:write"] === true,
        recordPayment: false,
        createDeal: false,
        editRecord: grants["deals:write"] === true,
      }}
    />
    {expenses && <RelatedExpensesPanel dealId={id} items={expenses.items} totals={expenses.totals} canWrite={grants["expenses:write"] === true} />}
    </>
  );
}
