import { redirect } from "next/navigation";
import { ROUTES } from "../../../../constants/routes";
import { requirePagePermission } from "../../../../lib/auth";
import { getCRMContactById, getAllServices, getAcceptedQuotationsUninvoiced, getQuotationById, listSalesPeople } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { NewInvoiceFormView } from "../../../../components/invoices/NewInvoiceFormView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("invoices/new");

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; quotationId?: string; dealId?: string }>;
}) {
  const actor = await requirePagePermission("invoices", "write");
  await requirePagePermission("contacts", "read");
  const params = await searchParams;

  const [acceptedQuotations, company, services, salesPeople] = await Promise.all([
    getAcceptedQuotationsUninvoiced(),
    getCachedCompanySettings(),
    getAllServices({ isActive: true }),
    listSalesPeople(),
  ]);

  let preselectedQuotation: any = null;
  if (params?.quotationId) {
    preselectedQuotation =
      acceptedQuotations.find((q) => q.id === params.quotationId) ||
      (await getQuotationById(params.quotationId));
  }

  if (preselectedQuotation && preselectedQuotation.currency !== company.default_currency) redirect(ROUTES.quotations.detail(preselectedQuotation.id));

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

      salesPeople={salesPeople}
      currentUserId={actor.id}
    />
  );
}
