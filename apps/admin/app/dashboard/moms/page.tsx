import { requirePagePermission } from "../../../lib/auth";
import { getMinutesOfMeetings } from "@platform/database";
import { MomsListView } from "../../../components/moms/MomsListView";

export const dynamic = "force-dynamic";

export default async function MomsPage() {
  await requirePagePermission("moms", "read");
  const moms = await getMinutesOfMeetings();

  return <MomsListView initialMoms={moms} />;
}
