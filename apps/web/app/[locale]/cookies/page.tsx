import { LegalPolicyView, type PolicySectionItem } from "../../../components/legal/LegalPolicyView";
import { getSite, requireSiteLanguage, siteTranslations } from "../../../lib/site";

export const dynamic = "force-dynamic";

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  const [{ company }, t] = await Promise.all([getSite(), siteTranslations(locale)]);

  const sections: PolicySectionItem[] = [
    {
      heading: t.cookies.essentialTitle,
      body: t.cookies.essentialDesc,
    },
    {
      heading: t.cookies.preferencesTitle,
      body: t.cookies.preferencesDesc,
    },
    {
      heading: t.cookies.analyticsTitle,
      body: t.cookies.analyticsDesc,
    },
  ];

  return (
    <LegalPolicyView
      kind="cookies"
      title={t.cookies.policyTitle}
      intro={t.cookies.policyIntro}
      sections={sections}
      company={company}
    />
  );
}
