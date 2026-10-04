import { Metadata } from "next";
import { getCompanySettings } from "@ishoot/database";
import { adminTranslations } from "../../../lib/translations-bilingual";
import { ForgotPasswordForm } from "../../../components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: `Forgot Password | ${adminTranslations.en.brandName}`,
};

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const company = await getCompanySettings();
  return (
    <ForgotPasswordForm
      companyName={company.company_name_en}
      logoUrl={company.dark_logo_url || company.logo_url}
      iconUrl={company.dark_icon_url || company.icon_url}
    />
  );
}
