import { requirePagePermission } from "../../../../lib/auth";
import { discountDecision, listSalesPeople } from "@platform/database";
import { getCRMContactById, getAllServices, getFxBoard } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { NewQuotationFormView } from "../../../../components/quotations/NewQuotationFormView";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; dealId?: string; inquiryId?: string }>;
}) {
  const actor = await requirePagePermission("quotations", "create");
  await requirePagePermission("contacts", "read");
  const params = await searchParams;

  const [contacts, company, services, fxBoard, discountPolicy, salesPeople] = await Promise.all([
    params?.clientId
      ? getCRMContactById(params.clientId).then((c) => (c ? [c] : []))
      : Promise.resolve([]),
    getCachedCompanySettings(),
    getAllServices({ isActive: true }),
    getFxBoard(),
    discountDecision(actor.id, 100, 0),
    listSalesPeople(),
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
      salesPeople={salesPeople}
      currentUserId={actor.id}
    />
  );
}
