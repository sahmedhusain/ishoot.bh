import { LegalPolicyView, type PolicySectionItem } from "../../../components/legal/LegalPolicyView";
import { getSite, requireSiteLanguage, siteTranslations } from "../../../lib/site";

export const dynamic = "force-dynamic";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  const [{ company }, t] = await Promise.all([getSite(), siteTranslations(locale)]);
  const ar = locale === "ar";
  const companyName = ar ? company.company_name_ar || company.company_name_en : company.company_name_en || company.company_name_ar;
  const customRules = ar ? company.rules_ar || company.rules_en : company.rules_en || company.rules_ar;

  const sections: PolicySectionItem[] = ar
    ? [
        {
          heading: "البيانات التي نجمعها",
          body: `تجمع ${companyName} فقط معلومات الاتصال والتفاصيل التي ترسلونها طوعاً عبر نماذج التواصل وطلبات العروض أو مراجعات العملاء.`,
        },
        {
          heading: "أغراض المعالجة وأمن المعلومات",
          body: "تُستخدم البيانات للرد على استفساراتكم وإعداد العروض الفنية والمالية وتحسين موثوقية الموقع، مع تطبيق ضوابط التشفير وتقييد الصلاحيات.",
        },
        {
          heading: "الاحتفاظ بالبيانات وحقوقكم",
          body: `يُحتفظ بالبيانات للمدة اللازمة لتنفيذ الالتزامات القانونية والتعاقدية فقط. يمكنكم طلب الاطلاع على بياناتكم أو تصحيحها أو حذفها عبر البريد الرسمي ${company.email || ""}.`,
        },
      ]
    : [
        {
          heading: "Information We Collect",
          body: `${companyName} collects only the contact details, organizational metadata, and inquiry attachments you voluntarily submit when requesting consultations, proposals, or client reviews.`,
        },
        {
          heading: "Security & Access Controls",
          body: "All portal communications run over encrypted transport channels, protected by role-based internal access controls and formal retention governance aligned with regional Personal Data Protection frameworks.",
        },
        {
          heading: "Data Retention & Your Rights",
          body: `Records are retained solely for contractual delivery, audit compliance, and direct client follow-up. You may request access, correction, or erasure of your data at any time via ${company.email || "our corporate privacy desk"}.`,
        },
      ];

  return (
    <LegalPolicyView
      kind="privacy"
      title={t.footer.rulesModalTitle}
      intro={ar ? `سياسة حماية البيانات والخصوصية والأمان المؤسسي في ${companyName}.` : `Data protection, information security, and privacy governance framework of ${companyName}.`}
      customHtmlOrText={customRules}
      sections={sections}
      company={company}
    />
  );
}
