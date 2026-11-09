import { requireAllowed } from "../../../lib/session";
import { DeploymentsView } from "../../../components/DeploymentsView";

export default async function DeploymentsPage() {
  const user = await requireAllowed("system_health", "read");

  return <DeploymentsView />;
}
