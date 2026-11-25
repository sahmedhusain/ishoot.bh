import { ItUnifiedErrorPage } from "../components/ItUnifiedErrorPage";
import { getCompanyBranding } from "../lib/company-branding";

export default async function Forbidden() {
  const branding = await getCompanyBranding().catch(() => undefined);
  return <ItUnifiedErrorPage statusCode={403} branding={branding} />;
}
