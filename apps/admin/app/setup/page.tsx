import { redirect } from "next/navigation";
import { ensureDefaultFeatureModules } from "@platform/database";
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

  const toggles = await ensureDefaultFeatureModules();
  // A fresh company starts with placeholder names; the wizard asks for the real ones.
  const placeholder = company.company_name_en === "New company";
  return (
    <SetupWizard
      company={{
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
      }}
      modules={toggles.map((m) => ({ moduleKey: m.moduleKey, nameEn: m.nameEn, nameAr: m.nameAr }))}
    />
  );
}
