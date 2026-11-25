import { getStoreSettings } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getStorePolicyDoc } from "../../../lib/store-policy-pages";
import { getSite } from "../../../lib/site";
import { PolicyDocumentView } from "../../../components/shared/PolicyDocumentView";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ company }, settings] = await Promise.all([
    getSite(),
    getStoreSettings().catch(() => null),
  ]);
  const doc = getStorePolicyDoc("terms", locale, {
    crNumber: settings?.cr_number,
    vatNumber: settings?.vat_number,
    returnWindowDays: settings?.return_window_days,
    termsText: pickText(company?.terms_en, company?.terms_ar, locale),
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
