import { getTranslations } from "@ishoot/locales";
import { getCRMContactById } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../../lib/cached-queries";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { NewDealFormView } from "../../../../../components/crm/NewDealFormView";
import type { NewDealQuery } from "../../../../../constants/routes";

export const metadata = { title: getTranslations("ar").admin.copy.newDeal };

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ [K in keyof NewDealQuery]?: string }>;
}) {
  await requirePagePermission("deals", "write");
  const [{ clientId }, canPickContact, canCreateContact, settings] = await Promise.all([
    searchParams,
    hasPermission("contacts", "read"),
    hasPermission("contacts", "write"),
    getCachedCompanySettings(),
  ]);
  const preselected = canPickContact && clientId ? await getCRMContactById(clientId) : null;
  return (
    <NewDealFormView
      defaultCurrency={settings.default_currency}
      canPickContact={canPickContact}
      canCreateContact={canCreateContact}
      initialContact={preselected}
    />
  );
}
