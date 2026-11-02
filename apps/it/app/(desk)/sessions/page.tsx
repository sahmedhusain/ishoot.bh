import { listIdentitySessionsForIT, type Realm } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import {
  SessionsView,
  type SessionFilter,
} from "../../../components/SessionsView";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAllowed("sessions", "read");
  const params = await searchParams;
  const query = (name: string) => {
    const value = params[name];
    return (Array.isArray(value) ? value[0] : value) || "";
  };
  const realm = ["staff", "customer", "it"].includes(query("realm"))
    ? (query("realm") as Realm)
    : "";
  const filter: SessionFilter = {
    realm,
    subjectId: query("subjectId").trim().slice(0, 200),
    cursor: query("cursor").slice(0, 36),
  };
  const page = await asUser(() =>
    listIdentitySessionsForIT(user.token, {
      realm: realm || undefined,
      subjectId: filter.subjectId || undefined,
      cursor: filter.cursor || undefined,
    }),
  );
  return (
    <SessionsView
      page={page}
      filter={filter}
      currentSessionId={user.sessionId}
      now={Date.now()}
      canRevoke={itAllowed(user.roles, "sessions", "delete")}
    />
  );
}
