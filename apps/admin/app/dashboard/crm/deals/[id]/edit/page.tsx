import { requirePagePermission } from "../../../../../../lib/auth";
import { getActiveDealStages, getCRMDealById, getCRMContactById, db } from "@platform/database";
import { notFound } from "next/navigation";
import { DealEditFormView } from "../../../../../../components/crm/DealEditFormView";
import { pageMetadata } from "../../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("crm/deals/[id]/edit");

export const dynamic = "force-dynamic";

interface DealEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealEditPage({ params }: DealEditPageProps) {
  await requirePagePermission("deals", "write");
  await requirePagePermission("contacts", "read");
  const { id } = await params;

  const dealPromise = getCRMDealById(id);
  const [deal, contacts, owners, stages] = await Promise.all([
    dealPromise,
    dealPromise.then(d => d?.contact_id ? getCRMContactById(d.contact_id).then(c => c ? [c] : []) : []),
    db.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    getActiveDealStages(),
  ]);

  if (!deal) {
    notFound();
  }

  return <DealEditFormView deal={deal} contacts={contacts} owners={owners} stages={stages} />;
}
