import { itAllowed } from "@platform/contracts";
import { requireAllowed } from "../../../lib/session";
import { StorePresetsView } from "../../../components/StorePresetsView";

export default async function StorePresetsPage() {
  const user = await requireAllowed("setup", "read");
  return <StorePresetsView canEdit={itAllowed(user.roles, "setup", "edit")} />;
}
