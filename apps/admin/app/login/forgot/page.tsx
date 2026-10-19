import { companyMetadata } from "../../../lib/company-metadata";
import { getCompanySettings } from "@platform/database";
import { adminTranslations } from "../../../lib/translations-bilingual";
import { ForgotPasswordForm } from "../../../components/auth/ForgotPasswordForm";

export const generateMetadata = () => companyMetadata(adminTranslations.ar.forgotPasswordForm.resetPassword);

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const company = await getCompanySettings();
  return (
    <ForgotPasswordForm
      companyName={company.company_name_en}
      logoUrl={company.logo_url} darkLogoUrl={company.dark_logo_url} iconUrl={company.icon_url} darkIconUrl={company.dark_icon_url} />
  );
}
