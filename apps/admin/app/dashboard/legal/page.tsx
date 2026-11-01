import { contractRegister, licenceRegister, listLegalMatters, requireFeatureEnabled, taskChoices } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../lib/auth";
import { getCachedCompanySettings } from "../../../lib/cached-queries";
import { LegalView } from "../../../components/outreach/LegalView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("legal");

export const dynamic = "force-dynamic";

export default async function LegalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePagePermission("legal", "read");
  await requireFeatureEnabled("legal");
  const query = await searchParams;
  const status = query.status === "all" ? "" : "open";
  const q = typeof query.q === "string" ? query.q : "";
  const [matters, licences, contracts, company, canEdit, people] = await Promise.all([
    listLegalMatters({ status, q }),
    licenceRegister(),
    contractRegister(),
    getCachedCompanySettings(),
    hasPermission("legal", "edit"),
    taskChoices({ userId: user.id, departmentId: null, all: true }),
  ]);
  return <LegalView matters={matters} licences={licences} contracts={contracts} filters={{ status: status || "all", q }} currency={company.default_currency} canEdit={canEdit} people={people.users} today={new Date().toISOString().slice(0, 10)} />;
}
