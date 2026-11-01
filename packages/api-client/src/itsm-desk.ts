// The itsm desk (backend/services/itsm): IT staff working tickets with their own IT-realm access tokens. Each call
// needs the catalogue permission the itsm OpenAPI document names (contracts/catalog/it-access.json).
import type { components, paths } from "./generated/itsm";
import { apiError } from "./errors";
import { unwrap, unwrapEmpty, userClient } from "./http";

export type SLAPolicy = components["schemas"]["SLAPolicy"];
export type QueueFilter = {
  status?: string;
  priority?: string;
  assigneeId?: string;
  open?: boolean;
  cursor?: string;
  limit?: number;
};

const desk = (token: string) => userClient<paths>(token);

/** Open tickets counted per status and priority. */
export const queueStats = (token: string) =>
  unwrap(desk(token).GET("/v1/itsm/desk/stats"));

/** One page of the queue, newest first. */
export const listQueue = (token: string, query: QueueFilter = {}) =>
  unwrap(desk(token).GET("/v1/itsm/desk/tickets", { params: { query } }));

/** A ticket with internal notes and the full history, or null when there is none. */
export async function getQueueTicket(token: string, id: string) {
  const { data, error, response } = await desk(token).GET(
    "/v1/itsm/desk/tickets/{id}",
    { params: { path: { id } } },
  );
  if (response.status === 404) return null;
  if (!response.ok || !data) throw await apiError(response, error);
  return data;
}

/** Applies a catalogue transition; "assign" needs the assignee. */
export const transitionQueueTicket = (
  token: string,
  id: string,
  body: { transition: string; assigneeId?: string; assigneeName?: string },
) =>
  unwrap(
    desk(token).POST("/v1/itsm/desk/tickets/{id}/transitions", {
      params: { path: { id } },
      body,
    }),
  );

/** Adds a reply to the requester, or an internal note they never see. */
export const commentOnQueueTicket = (
  token: string,
  id: string,
  body: string,
  internal: boolean,
) =>
  unwrap(
    desk(token).POST("/v1/itsm/desk/tickets/{id}/comments", {
      params: { path: { id } },
      body: { body, internal },
    }),
  );

/** The SLA targets per priority. */
export const listSLA = async (token: string) =>
  (await unwrap(desk(token).GET("/v1/itsm/desk/sla"))).items;

/** Changes one priority's SLA targets; existing tickets keep their deadlines. */
export const updateSLA = (
  token: string,
  priority: string,
  minutes: { responseMinutes: number; resolveMinutes: number },
) =>
  unwrapEmpty(
    desk(token).PUT("/v1/itsm/desk/sla/{priority}", {
      params: { path: { priority } },
      body: minutes,
    }),
  );
