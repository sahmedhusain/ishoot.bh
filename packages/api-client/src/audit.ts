// The audit service (backend/services/audit): every event the services publish, read by IT accounts (audit:read).
import type { components, paths } from "./generated/audit";
import { unwrap, userClient } from "./http";

export type AuditEvent = components["schemas"]["AuditEvent"];
export type AuditQuery = NonNullable<
  paths["/v1/audit/desk/events"]["get"]["parameters"]["query"]
>;

/** One page of the trail, newest first; pass nextCursor back as cursor for the next. */
export const listAuditEvents = (token: string, query: AuditQuery = {}) =>
  unwrap(
    userClient<paths>(token).GET("/v1/audit/desk/events", {
      params: { query },
    }),
  );

/** One event. */
export const getAuditEvent = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/audit/desk/events/{id}", {
      params: { path: { id } },
    }),
  );

/** Every subject recorded, with counts. */
export const listAuditSubjects = async (token: string) =>
  (await unwrap(userClient<paths>(token).GET("/v1/audit/desk/subjects")))
    .items;
