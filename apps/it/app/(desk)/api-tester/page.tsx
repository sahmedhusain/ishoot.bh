import { requireAllowed } from "../../../lib/session";
import { ApiTesterView } from "../../../components/ApiTesterView";

export default async function ApiTesterPage() {
  const user = await requireAllowed("system_health", "read");

  return <ApiTesterView token={user.token} />;
}
