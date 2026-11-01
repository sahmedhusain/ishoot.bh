import { listSLA } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import { SLAView } from "../../../components/SLAView";

export default async function SLAPage() {
  const user = await requireAllowed("ticket_settings", "read");
  const policies = await asUser(() => listSLA(user.token));
  return (
    <SLAView
      policies={policies}
      canEdit={itAllowed(user.roles, "ticket_settings", "edit")}
    />
  );
}
