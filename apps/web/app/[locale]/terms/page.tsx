import { LegalPolicyView, type PolicySectionItem } from "../../../components/legal/LegalPolicyView";
import { getSite, requireSiteLanguage, siteTranslations } from "../../../lib/site";

export const dynamic = "force-dynamic";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  const [{ company }, t] = await Promise.all([getSite(), siteTranslations(locale)]);
  const ar = locale === "ar";
  const companyName = ar ? company.company_name_ar || company.company_name_en : company.company_name_en || company.company_name_ar;
  const customTerms = ar ? company.terms_ar || company.terms_en : company.terms_en || company.terms_ar;

  const sections: PolicySectionItem[] = ar
    ? [
        {
          heading: "نطاق التعاقد والخدمات",
          body: `تنطبق هذه الشروط على كافة الاتفاقيات والعروض والمشاريع المنفذة من قِبل ${companyName}. تخضع المخرجات والجداول الزمنية لنطاق العمل المكتوب والمعتمد بين الطرفين.`,
        },
        {
          heading: "الأسعار والعملة والفوترة",
          body: `تُصدر الفواتير بعملة ${company.default_currency || "BHD"} وفق الأنظمة الضريبية المعمول بها، وتُستحق الدفعات حسب مراحل التسليم المتفق عليها في العقد أو عرض السعر الرسمي.`,
        },
        {
          heading: "الملكية الفكرية والسرية",
          body: `يلتزم الطرفان بحماية جميع المعلومات التجارية والفنية السرية. تنتقل حقوق الاستخدام المتفق عليها إلى العميل عند إتمام السداد والاعتماد النهائي.`,
        },
        {
          heading: "الحوكمة والأنظمة المعمول بها",
          body: `تُفسر هذه الشروط وتُطبق وفق القوانين التجارية المعمول بها، وتُحال أي استفسارات تعاقدية أو ملاحظات رسمية إلى المقر الرئيسي للشركة.`,
        },
      ]
    : [
        {
          heading: "Scope of Services & Engagement",
          body: `These Terms & Conditions govern advisory engagements, project deliverables, and commercial portals operated by ${companyName}. Specific milestones, SLAs, and acceptance criteria are detailed in signed proposals and statements of work.`,
        },
        {
          heading: "Commercial Terms, Currency & Taxation",
          body: `Official quotations and invoices are issued in ${company.default_currency || "BHD"} in full alignment with applicable statutory invoicing and VAT requirements. Payments become due against documented project milestones.`,
        },
        {
          heading: "Confidentiality & Intellectual Property",
          body: `Both parties maintain strict confidentiality across shared business, financial, and technical records. Agreed client deliverables transfer upon formal project sign-off and settlement.`,
        },
        {
          heading: "Governing Framework & Compliance",
          body: `${companyName} operates in compliance with applicable commercial registration rules, occupational safety mandates, and formal dispute-resolution procedures.`,
        },
      ];

  return (
    <LegalPolicyView
      kind="terms"
      title={t.footer.termsModalTitle}
      intro={ar ? `الشروط التجارية والتعاقدية الرسمية المعتمدة لدى ${companyName}.` : `Official commercial terms and corporate engagement governance for ${companyName}.`}
      customHtmlOrText={customTerms}
      sections={sections}
      company={company}
    />
  );
}
