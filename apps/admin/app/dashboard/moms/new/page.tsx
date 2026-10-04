import { requirePermission } from "../../../../lib/auth";
import * as React from "react";

import { NewMomFormView } from "../../../../components/moms/NewMomFormView";

export const dynamic = "force-dynamic";

export default async function NewMomPage() {
  await requirePermission("moms", "write");

  return <NewMomFormView clients={[]} deals={[]} />;
}
