import type { components, paths } from "./generated/audit";
import { unwrap, userClient } from "./http";

export type AuditEvent = components["schemas"]["AuditEvent"];
export type AuditQuery = NonNullable<
  paths["/v1/audit/desk/events"]["get"]["parameters"]["query"]
>;

export const listAuditEvents = (token: string, query: AuditQuery = {}) =>
  unwrap(
    userClient<paths>(token).GET("/v1/audit/desk/events", {
      params: { query },
    }),
  );

export const getAuditEvent = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/audit/desk/events/{id}", {
      params: { path: { id } },
    }),
  );

export const listAuditSubjects = async (token: string) =>
  (await unwrap(userClient<paths>(token).GET("/v1/audit/desk/subjects")))
    .items;
