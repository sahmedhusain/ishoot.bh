import { cashToSettle, listCodSettlements, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { CashSettlementView } from "../../../../components/delivery/CashSettlementView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("delivery/cash");

export const dynamic = "force-dynamic";

export default async function DriverCashPage() {
  await requirePagePermission("deliveries", "assign");
  await requireFeatureEnabled("delivery");
  const [pending, history, company, canSettle] = await Promise.all([cashToSettle(), listCodSettlements(), getCachedCompanySettings(), hasPermission("payments", "create")]);
  return <CashSettlementView pending={pending} history={history} currency={company.default_currency} canSettle={canSettle} />;
}
