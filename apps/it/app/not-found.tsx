import { ItUnifiedErrorPage } from "../components/ItUnifiedErrorPage";
import { getCompanyBranding } from "../lib/company-branding";

export default async function NotFound() {
  const branding = await getCompanyBranding().catch(() => undefined);
  return <ItUnifiedErrorPage statusCode={404} branding={branding} />;
}
