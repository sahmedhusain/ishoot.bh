import * as React from "react";
import { Metadata } from "next";
import { getCompanySettings } from "@ishoot/database";
import { adminTranslations } from "../../../lib/translations";
import { ResetPasswordForm } from "../../../components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: `Reset Password | ${adminTranslations.en.brandName}`,
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const company = await getCompanySettings();
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm 
        companyName={company.company_name_en} 
        logoUrl={company.dark_logo_url || company.logo_url} 
        iconUrl={company.dark_icon_url || company.icon_url} 
      />
    </React.Suspense>
  );
}
