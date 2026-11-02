import { redirect } from "next/navigation";
import { companyMetadata } from "../../lib/company-metadata";
import { requireAuth } from "../../lib/auth";
import { adminTranslations } from "../../lib/translations-bilingual";

export const dynamic = "force-dynamic";
export const generateMetadata = () => companyMetadata(adminTranslations.ar.setupWizard.title);

/** First-run setup: managed in the IT portal. Admin users are redirected to the dashboard. */
export default async function SetupPage() {
  await requireAuth();
  redirect("/dashboard");
}
