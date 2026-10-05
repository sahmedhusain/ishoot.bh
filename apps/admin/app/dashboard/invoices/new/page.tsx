import { requirePermission } from "../../../../lib/auth";
import { getCRMContactById, getAllServices, getAcceptedQuotationsUninvoiced, getQuotationById, getFxBoard, listSalesPeople } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { NewInvoiceFormView } from "../../../../components/invoices/NewInvoiceFormView";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; quotationId?: string; dealId?: string }>;
}) {
  const actor = await requirePermission("invoices", "write");
  await requirePermission("contacts", "read");
  const params = await searchParams;

  const [acceptedQuotations, company, services, fxBoard, salesPeople] = await Promise.all([
    getAcceptedQuotationsUninvoiced(),
    getCachedCompanySettings(),
    getAllServices({ isActive: true }),
    getFxBoard(),
    listSalesPeople(),
  ]);

  let preselectedQuotation = null;
  if (params?.quotationId) {
    preselectedQuotation =
      acceptedQuotations.find((q) => q.id === params.quotationId) ||
      (await getQuotationById(params.quotationId));
  }

  const effectiveClientId =
    params?.clientId || preselectedQuotation?.clientId || undefined;

  const contacts = effectiveClientId
    ? await getCRMContactById(effectiveClientId).then((c) => (c ? [c] : []))
    : [];

  return (
    <NewInvoiceFormView
      initialContacts={contacts}
      company={company}
      services={services}
      preselectedClientId={effectiveClientId}
      acceptedQuotations={acceptedQuotations}
      preselectedQuotation={preselectedQuotation}
      dealId={params?.dealId}
      fxRates={Object.fromEntries(fxBoard.map((row) => [row.currency, row.perBhd]))}
      salesPeople={salesPeople}
      currentUserId={actor.id}
    />
  );
}
