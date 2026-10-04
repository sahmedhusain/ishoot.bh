import { requirePermission } from "../../../../lib/auth";
import {
  getCRMContactById,
  getCompanySettings,
  getAllServices,
  getAcceptedQuotationsUninvoiced,
  getQuotationById,
} from "@ishoot/database";
import { NewInvoiceFormView } from "../../../../components/invoices/NewInvoiceFormView";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; quotationId?: string }>;
}) {
  await requirePermission("invoices", "write");
  await requirePermission("contacts", "read");
  const params = await searchParams;

  const [acceptedQuotations, company, services] = await Promise.all([
    getAcceptedQuotationsUninvoiced(),
    getCompanySettings(),
    getAllServices({ isActive: true }),
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
    />
  );
}
