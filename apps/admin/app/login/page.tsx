import { companyMetadata } from "../../lib/company-metadata";
import * as React from "react";
import { AdminLoginFormView } from "../../components/auth/AdminLoginFormView";
import { getCachedCompanySettings } from "../../lib/cached-queries";
import { adminTranslations } from "../../lib/translations-bilingual";

export const generateMetadata = () => companyMetadata(adminTranslations.ar.loginView.title);

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const company = await getCachedCompanySettings();
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-brand-base flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <AdminLoginFormView companyName={company.company_name_en} logoUrl={company.logo_url} darkLogoUrl={company.dark_logo_url} iconUrl={company.icon_url} darkIconUrl={company.dark_icon_url} />
    </React.Suspense>
  );
}
