import { notFound } from "next/navigation";
import { getLegalMatter, requireFeatureEnabled, taskChoices } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { LegalMatterView } from "../../../../components/outreach/LegalView";

export const dynamic = "force-dynamic";

export default async function LegalMatterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("legal", "read");
  await requireFeatureEnabled("legal");
  const { id } = await params;
  const [matter, company, canEdit, people] = await Promise.all([getLegalMatter(id), getCachedCompanySettings(), hasPermission("legal", "edit"), taskChoices({ userId: user.id, departmentId: null, all: true })]);
  if (!matter) notFound();
  return <LegalMatterView matter={matter} currency={company.default_currency} canEdit={canEdit} people={people.users} />;
}
