import { redirect } from "next/navigation";
import { db, getFeatureToggles, getWebsiteEditor } from "@platform/database";
import { activityDepartments, isDepartmentKey } from "@platform/database/constants/departments";
import { resolveWebsiteConfig, validateWebsiteConfig, websiteConfigForActivity } from "@platform/database/website-config";
import { companyMetadata } from "../../lib/company-metadata";
import { getCachedCompanySettings } from "../../lib/cached-queries";
import { getCurrentPermissions, requireAuth } from "../../lib/auth";
import { adminTranslations } from "../../lib/translations-bilingual";
import { SetupWizard } from "../../components/setup/SetupWizard";
import { SetupWaitingView } from "../../components/setup/SetupWaitingView";

export const dynamic = "force-dynamic";
export const generateMetadata = () => companyMetadata(adminTranslations.ar.setupWizard.title);

/** First-run setup: shown until the company has been set up, then always redirects to the dashboard. */
export default async function SetupPage() {
  await requireAuth();
  const company = await getCachedCompanySettings();
  if (company.setup_completed) redirect("/dashboard");
  const permissions = await getCurrentPermissions();
  if (permissions["settings:write"] !== true) return <SetupWaitingView />;

  const [toggles, website, departmentRows] = await Promise.all([getFeatureToggles(), getWebsiteEditor(), db.department.findMany({ select: { catalogueKey: true } })]);
  const existingDepartments = departmentRows.map((row) => row.catalogueKey).filter(isDepartmentKey);
  const draft = validateWebsiteConfig(website.draft);
  const activity = company.business_activity ?? "other";
  // A draft that was never set up for an activity starts from the activity's recommendations.
  const websiteConfig = resolveWebsiteConfig(draft.purpose ? draft : websiteConfigForActivity(activity, draft), company.theme.websiteMode);
  // A fresh company starts with placeholder names; the wizard asks for the real ones.
  const placeholder = company.company_name_en === "New company";
  return (
    <SetupWizard
      company={{
        contentLanguages: company.content_languages,
        primaryLanguage: company.primary_language,
        businessActivity: company.business_activity ?? "",
        taglineEn: company.tagline_en ?? "",
        taglineAr: company.tagline_ar ?? "",
        foundedYear: company.founded_year ? String(company.founded_year) : "",
        city: company.city ?? "",
        country: company.country ?? "",
        whatsappPhone: company.whatsapp_phone ?? "",
        instagramUrl: company.instagram_url ?? "",
        linkedinUrl: company.linkedin_url ?? "",
        youtubeUrl: company.youtube_url ?? "",
        mapUrl: company.map_url ?? "",
        companyNameEn: placeholder ? "" : company.company_name_en,
        companyNameAr: placeholder ? "" : company.company_name_ar,
        crNumber: company.cr_number,
        vatId: company.vat_id ?? "",
        addressEn: company.address_en,
        addressAr: company.address_ar,
        phone: company.phone,
        email: company.email,
        website: company.website,
      }}
      theme={company.theme}
      assets={{
        logo_light: company.logo_url ?? "",
        logo_dark: company.dark_logo_url ?? "",
        icon_light: company.icon_url ?? "",
        icon_dark: company.dark_icon_url ?? "",
        stamp: company.stamp_url ?? "",
        signature: company.signature_url ?? "",
      }}
      config={{
        defaultCurrency: company.default_currency,
        vatEnabled: company.vat_enabled,
        vatPercentage: company.vat_percentage,
        invoicePrefix: company.invoice_prefix,
        invoiceNextNumber: company.invoice_next_number,
        receiptPrefix: company.receipt_prefix,
        receiptNextNumber: company.receipt_next_number,
        paymentTermsDays: company.payment_terms_days,
        modules: toggles.map((m) => ({ moduleKey: m.moduleKey, isEnabled: m.isEnabled })),
        departments: Array.from(new Set([...existingDepartments, ...(company.business_activity ? activityDepartments(company.business_activity) : [])])),
      }}
      existingDepartments={existingDepartments}
      domains={{ websiteDomain: company.website_domain ?? "", adminDomain: company.admin_domain ?? "" }}
      website={{ enabled: toggles.find((m) => m.moduleKey === "cms")?.isEnabled !== false, config: websiteConfig }}
      modules={toggles.map((m) => ({ moduleKey: m.moduleKey, nameEn: m.nameEn, nameAr: m.nameAr }))}
    />
  );
}
