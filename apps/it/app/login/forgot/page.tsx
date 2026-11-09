import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/session";
import { getCompanyBranding } from "../../../lib/company-branding";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (await currentUser()) redirect("/");
  const branding = await getCompanyBranding();
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-[#f4f6f8] dark:bg-[#0b1320]">
      <ForgotPasswordForm branding={branding} />
    </main>
  );
}
