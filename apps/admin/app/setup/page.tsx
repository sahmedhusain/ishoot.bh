import { companyMetadata } from "../../lib/company-metadata";
import { requireAuth } from "../../lib/auth";
import { adminTranslations } from "../../lib/translations-bilingual";
import { SetupWaitingView } from "../../components/setup/SetupWaitingView";

export const dynamic = "force-dynamic";
export const generateMetadata = () => companyMetadata(adminTranslations.ar.setupWizard.title);

/** First-run setup: managed in the IT portal. */
export default async function SetupPage() {
  await requireAuth();
  return <SetupWaitingView />;
}
