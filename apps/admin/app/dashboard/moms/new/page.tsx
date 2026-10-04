import { requirePermission } from "../../../../lib/auth";

import { NewMomFormView } from "../../../../components/moms/NewMomFormView";

export const dynamic = "force-dynamic";

export default async function NewMomPage() {
  await requirePermission("moms", "write");

  return <NewMomFormView clients={[]} deals={[]} />;
}
