import { getStoreSettings } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getStorePolicyDoc } from "../../../lib/store-policy-pages";
import { getSite } from "../../../lib/site";
import { PolicyDocumentView } from "../../../components/shared/PolicyDocumentView";

export default async function ExtendedWarrantyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ company }, settings] = await Promise.all([
    getSite(),
    getStoreSettings().catch(() => null),
  ]);
  const doc = getStorePolicyDoc("devo-warranty", locale, {
    crNumber: settings?.cr_number,
    companyName: pickText(company?.company_name_en, company?.company_name_ar, locale),
  });
  return (
    <PolicyDocumentView
      locale={locale}
      doc={doc}
      crNumber={settings?.cr_number}
      sslBadgeEnabled={settings?.ssl_badge_enabled ?? true}
    />
  );
}
