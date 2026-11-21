import { requireAllowed } from "../../../lib/session";
import { loadOpenApiEndpoints } from "../../../lib/openapi-catalog";
import { ApiTesterView } from "../../../components/ApiTesterView";

export default async function ApiTesterPage() {
  const user = await requireAllowed("system_health", "read");
  const endpoints = loadOpenApiEndpoints();

  return <ApiTesterView token={user.token} endpoints={endpoints} />;
}
