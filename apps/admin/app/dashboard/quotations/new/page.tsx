import { requirePermission } from "../../../../lib/auth";
import { getCRMContactById, getAllServices, getLatestExchangeRate, QUOTABLE_CURRENCIES } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { NewQuotationFormView } from "../../../../components/quotations/NewQuotationFormView";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; dealId?: string; inquiryId?: string }>;
}) {
  await requirePermission("quotations", "create");
  await requirePermission("contacts", "read");
  const params = await searchParams;

  const [contacts, company, services, rates] = await Promise.all([
    params?.clientId
      ? getCRMContactById(params.clientId).then((c) => (c ? [c] : []))
      : Promise.resolve([]),
    getCachedCompanySettings(),
    getAllServices({ isActive: true }),
    Promise.all(
      QUOTABLE_CURRENCIES.filter((code) => code !== "BHD").map(async (code) => [code, (await getLatestExchangeRate("BHD", code)).rate] as const),
    ),
  ]);

  return (
    <NewQuotationFormView
      initialContacts={contacts}
      company={company}
      services={services}
      preselectedClientId={params?.clientId}
      dealId={params?.dealId}
      inquiryId={params?.inquiryId}
      fxRates={Object.fromEntries(rates)}
    />
  );
}
