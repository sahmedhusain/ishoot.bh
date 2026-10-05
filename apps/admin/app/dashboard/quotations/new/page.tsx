import { requirePermission } from "../../../../lib/auth";
import { discountDecision } from "@ishoot/database";
import { getCRMContactById, getAllServices, getFxBoard } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { NewQuotationFormView } from "../../../../components/quotations/NewQuotationFormView";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; dealId?: string; inquiryId?: string }>;
}) {
  const actor = await requirePermission("quotations", "create");
  await requirePermission("contacts", "read");
  const params = await searchParams;

  const [contacts, company, services, fxBoard, discountPolicy] = await Promise.all([
    params?.clientId
      ? getCRMContactById(params.clientId).then((c) => (c ? [c] : []))
      : Promise.resolve([]),
    getCachedCompanySettings(),
    getAllServices({ isActive: true }),
    getFxBoard(),
    discountDecision(actor.id, 100, 0),
  ]);

  return (
    <NewQuotationFormView
      initialContacts={contacts}
      company={company}
      services={services}
      preselectedClientId={params?.clientId}
      dealId={params?.dealId}
      inquiryId={params?.inquiryId}
      fxBoard={fxBoard}
      discountLimit={discountPolicy.limit}
      alwaysNeedsApproval={discountPolicy.needsApproval}
    />
  );
}
