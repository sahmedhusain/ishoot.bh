import { requirePermission } from "../../../lib/auth";
import * as React from "react";
import { getMinutesOfMeetings } from "@ishoot/database";
import { MomsListView } from "../../../components/moms/MomsListView";

export const dynamic = "force-dynamic";

export default async function MomsPage() {
  await requirePermission("moms", "read");
  const moms = await getMinutesOfMeetings();

  return <MomsListView initialMoms={moms} />;
}
