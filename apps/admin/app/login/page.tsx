import * as React from "react";
import { Metadata } from "next";
import { AdminLoginFormView } from "../../components/auth/AdminLoginFormView";
import { getCachedCompanySettings } from "../../lib/cached-queries";
import { adminTranslations } from "../../lib/translations-bilingual";

export const metadata: Metadata = {
  title: `${adminTranslations.en.loginView.title} | ${adminTranslations.en.brandName}`,
  description: adminTranslations.en.loginView.subtitle,
};

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const company = await getCachedCompanySettings();
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#050807] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <AdminLoginFormView companyName={company.company_name_en} logoUrl={company.dark_logo_url || company.logo_url} iconUrl={company.dark_icon_url || company.icon_url} />
    </React.Suspense>
  );
}
