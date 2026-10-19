import { requirePagePermission } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";

import { NewMomFormView } from "../../../../components/moms/NewMomFormView";

export const dynamic = "force-dynamic";

export default async function NewMomPage() {
  const user = await requirePagePermission("moms", "write");
  const company = await getCachedCompanySettings();
  return <NewMomFormView clients={[]} deals={[]} companyName={company.company_name_en} initialAttendee={{ name: user.full_name, email: user.email }} />;
}
