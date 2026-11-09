import { redirect } from "next/navigation";
import { getFeatureToggles, getWebsiteEditor } from "@platform/database";
import { listDepartments } from "../../lib/api/hr";
import { activityDepartments, isDepartmentKey, type DepartmentKey } from "@platform/database/constants/departments";
import { resolveWebsiteConfig, validateWebsiteConfig, websiteConfigForActivity } from "@platform/database/website-config";
import { companyMetadata } from "../../lib/company-metadata";
import { getCachedCompanySettings } from "../../lib/cached-queries";
import { getCurrentPermissions, requireAuth } from "../../lib/auth";
import { adminTranslations } from "../../lib/translations-bilingual";
import { normalizeTheme } from "../../lib/constants/theme";
import { SetupWizard } from "../../components/setup/SetupWizard";
import { SetupWaitingView } from "../../components/setup/SetupWaitingView";

export const dynamic = "force-dynamic";
export const generateMetadata = () => companyMetadata(adminTranslations.ar.setupWizard.title);

/** First-run setup: shown until the company has been set up or seeded, then always redirects to the dashboard. */
export default async function SetupPage() {
  const user = await requireAuth();
  const company = await getCachedCompanySettings().catch(() => null);
  const hasEnoughCompanyData = Boolean(
    company?.setup_completed ||
    company?.company_name_en ||
    company?.company_name_ar
  );
  if (hasEnoughCompanyData) {
    redirect("/dashboard");
  }

  const permissions = await getCurrentPermissions();
  const canSetup = Boolean(
    user.role === "super_admin" ||
    user.role === "admin" ||
    permissions["settings:write"] === true
  );

  if (!canSetup) {
    return <SetupWaitingView />;
  }

  const [toggles, website, departmentRows] = await Promise.all([
    getFeatureToggles().catch(() => []),
    getWebsiteEditor().catch(() => ({ draft: {} })),
    listDepartments().catch(() => []),
  ]);

  const existingDepartments = (departmentRows || [])
    .map((row: any) => row.catalogueKey)
    .filter((k: any): k is DepartmentKey => isDepartmentKey(k));

  const draft = validateWebsiteConfig((website as any)?.draft);
  const activity = company?.business_activity ?? "other";
  const websiteConfig = resolveWebsiteConfig(
    draft.purpose ? draft : websiteConfigForActivity(activity, draft),
    company?.theme?.websiteMode
  );
  const placeholder = company?.company_name_en === "New company";

  return (
    <SetupWizard
      company={{
        contentLanguages: company?.content_languages ?? ["en", "ar"],
        primaryLanguage: company?.primary_language ?? "en",
        businessActivity: company?.business_activity ?? "",
        taglineEn: company?.tagline_en ?? "",
        taglineAr: company?.tagline_ar ?? "",
        foundedYear: company?.founded_year ? String(company.founded_year) : "",
        city: company?.city ?? "",
        country: company?.country ?? "",
        whatsappPhone: company?.whatsapp_phone ?? "",
        instagramUrl: company?.instagram_url ?? "",
        linkedinUrl: company?.linkedin_url ?? "",
        youtubeUrl: company?.youtube_url ?? "",
        mapUrl: company?.map_url ?? "",
        companyNameEn: placeholder ? "" : (company?.company_name_en ?? ""),
        companyNameAr: placeholder ? "" : (company?.company_name_ar ?? ""),
        crNumber: company?.cr_number ?? "",
        vatId: company?.vat_id ?? "",
        addressEn: company?.address_en ?? "",
        addressAr: company?.address_ar ?? "",
        phone: company?.phone ?? "",
        email: company?.email ?? "",
        website: company?.website ?? "",
      }}
      theme={normalizeTheme(company?.theme)}
      assets={{
        logo_light: company?.logo_url ?? "",
        logo_dark: company?.dark_logo_url ?? "",
        icon_light: company?.icon_url ?? "",
        icon_dark: company?.dark_icon_url ?? "",
        stamp: company?.stamp_url ?? "",
        signature: company?.signature_url ?? "",
      }}
      config={{
        defaultCurrency: company?.default_currency ?? "BHD",
        vatEnabled: company?.vat_enabled ?? false,
        vatPercentage: company?.vat_percentage ?? 10,
        invoicePrefix: company?.invoice_prefix ?? "INV",
        invoiceNextNumber: company?.invoice_next_number ?? 101,
        receiptPrefix: company?.receipt_prefix ?? "RCT",
        receiptNextNumber: company?.receipt_next_number ?? 101,
        paymentTermsDays: company?.payment_terms_days ?? 30,
        modules: toggles.map((m: any) => ({ moduleKey: m.moduleKey, isEnabled: m.isEnabled })),
        departments: Array.from(
          new Set([
            ...existingDepartments,
            ...(company?.business_activity ? activityDepartments(company.business_activity) : []),
          ])
        ),
      }}
      existingDepartments={existingDepartments}
      domains={{
        websiteDomain: company?.website_domain ?? "",
        adminDomain: company?.admin_domain ?? "",
      }}
      website={{
        enabled: toggles.find((m: any) => m.moduleKey === "cms")?.isEnabled !== false,
        config: websiteConfig,
      }}
      modules={toggles.map((m: any) => ({ moduleKey: m.moduleKey, nameEn: m.nameEn, nameAr: m.nameAr }))}
    />
  );
}
