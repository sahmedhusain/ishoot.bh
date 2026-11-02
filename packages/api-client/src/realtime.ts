// The realtime service (backend/services/realtime, ADR 0012): live streams for browsers and people's statuses. The
// admin back end acts for its signed-in person with its service token; the IT dashboard uses the IT account's token.
import { apiUrl } from "./config";
import { apiError } from "./errors";
import type { components, paths } from "./generated/realtime";
import { serviceClient, unwrap, unwrapEmpty, userClient } from "./http";
import { serviceToken } from "./service-token";

export type Presence = components["schemas"]["Presence"];
export type StatusWindowInput = components["schemas"]["WindowInput"];
export type MyStatus = {
  presence: Presence;
  chosen: { status: string; message: string | null; expiresAt: string | null } | null;
  upcoming: { kind: string; status: string; source: string; startsAt: string; endsAt: string }[];
};
export type StatusChoice = { status: string; message?: string | null; expiresAt?: string | null };
export type RealtimeRealm = "staff" | "it";

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const realtime = () => (client ??= serviceClient<paths>());

/**
 * Opens a person's live stream through the gateway and returns the upstream response, whose body the app's own route
 * passes to the browser. Not through openapi-fetch: a stream has no timeout and is never parsed here.
 */
export async function openStream(
  who: { realm: RealtimeRealm; userId: string; session?: string; topics: string[] } | { token: string },
  signal: AbortSignal,
): Promise<Response> {
  const query = new URLSearchParams();
  let path = "/v1/realtime/me/stream";
  let authorization: string;
  if ("token" in who) {
    authorization = `Bearer ${who.token}`;
  } else {
    path = "/v1/realtime/stream";
    query.set("realm", who.realm);
    query.set("userId", who.userId);
    if (who.session) query.set("session", who.session);
    if (who.topics.length) query.set("topics", who.topics.join(","));
    authorization = `Bearer ${await serviceToken()}`;
  }
  const response = await fetch(`${apiUrl()}${path}${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: authorization, Accept: "text/event-stream" },
    signal,
    cache: "no-store",
  });
  if (!response.ok || !response.body) throw await apiError(response);
  return response;
}

/** Sends a hint to topics and people (for changes in domains still in Prisma). Never pass message text. */
export const publishHint = (body: {
  type: string;
  topics?: string[];
  users?: { realm: RealtimeRealm; id: string }[];
  data?: Record<string, string | number | boolean | null>;
}) => unwrapEmpty(realtime().POST("/v1/realtime/publish", { body }));

/** The statuses of people in a realm, in the order asked. */
export const getPresence = async (realm: RealtimeRealm, ids: string[]): Promise<Presence[]> =>
  ids.length
    ? (await unwrap(realtime().GET("/v1/realtime/presence", { params: { query: { realm, ids: ids.join(",") } } }))).items
    : [];

/** A person's own status, what they chose and what is coming. */
export const getMyStatus = (realm: RealtimeRealm, userId: string): Promise<MyStatus> =>
  unwrap(realtime().GET("/v1/realtime/status", { params: { query: { realm, userId } } }));

/** Records the status a person chose. */
export const setMyStatus = (realm: RealtimeRealm, userId: string, body: StatusChoice): Promise<MyStatus> =>
  unwrap(realtime().PUT("/v1/realtime/status", { params: { query: { realm, userId } }, body }));

/** Goes back to the automatic status. */
export const clearMyStatus = (realm: RealtimeRealm, userId: string): Promise<MyStatus> =>
  unwrap(realtime().DELETE("/v1/realtime/status", { params: { query: { realm, userId } } }));

/** The person's browser reports them idle or active again. */
export const reportActivity = (realm: RealtimeRealm, userId: string, state: "active" | "idle") =>
  unwrapEmpty(realtime().POST("/v1/realtime/activity", { params: { query: { realm, userId } }, body: { state } }));

/** Sets one record's window (a meeting, approved leave) for exactly the people given. */
export const replaceStatusWindow = (
  realm: RealtimeRealm,
  source: string,
  window: StatusWindowInput,
) => unwrapEmpty(realtime().PUT("/v1/realtime/windows", { body: { realm, source, ...window } }));

/** Removes one record's window for everyone; nothing to remove is not an error. */
export async function removeStatusWindow(realm: RealtimeRealm, source: string, sourceId: string) {
  const { error, response } = await realtime().DELETE("/v1/realtime/windows", {
    params: { query: { realm, source, sourceId } },
  });
  if (!response.ok && response.status !== 404) throw await apiError(response, error);
}

/** Replaces every window of a source in [from, until) with the ones given (the owning app's full picture). */
export const syncStatusWindows = (
  realm: RealtimeRealm,
  source: string,
  from: string,
  until: string,
  windows: StatusWindowInput[],
) => unwrap(realtime().POST("/v1/realtime/windows/sync", { body: { realm, source, from, until, windows } }));

// The signed-in IT account, with their own token.

export const getITPresence = async (token: string, ids: string[]): Promise<Presence[]> =>
  ids.length
    ? (await unwrap(userClient<paths>(token).GET("/v1/realtime/me/presence", { params: { query: { ids: ids.join(",") } } })))
        .items
    : [];

export const getITStatus = (token: string): Promise<MyStatus> =>
  unwrap(userClient<paths>(token).GET("/v1/realtime/me/status"));

export const setITStatus = (token: string, body: StatusChoice): Promise<MyStatus> =>
  unwrap(userClient<paths>(token).PUT("/v1/realtime/me/status", { body }));

export const clearITStatus = (token: string): Promise<MyStatus> =>
  unwrap(userClient<paths>(token).DELETE("/v1/realtime/me/status"));

export const reportITActivity = (token: string, state: "active" | "idle") =>
  unwrapEmpty(userClient<paths>(token).POST("/v1/realtime/me/activity", { body: { state } }));
