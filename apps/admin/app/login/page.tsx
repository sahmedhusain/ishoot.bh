import { companyMetadata } from "../../lib/company-metadata";
import * as React from "react";
import { Skeleton } from "@platform/ui";
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
        <div aria-busy="true" className="min-h-screen bg-brand-base flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4">
            <Skeleton className="h-10 w-32 mx-auto" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        </div>
      }
    >
      <AdminLoginFormView companyName={company.company_name_en} logoUrl={company.logo_url} darkLogoUrl={company.dark_logo_url} iconUrl={company.icon_url} darkIconUrl={company.dark_icon_url} />
    </React.Suspense>
  );
}
