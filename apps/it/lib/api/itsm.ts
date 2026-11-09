

import type { components, paths } from "./generated/itsm";
import { apiError } from "./errors";
import { serviceClient, unwrap } from "./http";

export type Ticket = components["schemas"]["Ticket"];
export type TicketDetail = components["schemas"]["TicketDetail"];
export type TicketComment = components["schemas"]["Comment"];
export type NewTicket = components["schemas"]["NewTicket"];
export type Attachment = components["schemas"]["Attachment"];
export type TicketPage = { items: Ticket[]; nextCursor?: string };
export type Requester = { id: string; name: string };

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const itsm = () => (client ??= serviceClient<paths>());

export const createTicket = (body: NewTicket) =>
  unwrap(itsm().POST("/v1/itsm/requests/tickets", { body }));

export const listMyTickets = (
  requesterId: string,
  options: { status?: string; cursor?: string; limit?: number } = {},
): Promise<TicketPage> =>
  unwrap(
    itsm().GET("/v1/itsm/requests/tickets", {
      params: { query: { requesterId, ...options } },
    }),
  );

export async function getMyTicket(
  id: string,
  requesterId: string,
): Promise<TicketDetail | null> {
  const { data, error, response } = await itsm().GET(
    "/v1/itsm/requests/tickets/{id}",
    { params: { path: { id }, query: { requesterId } } },
  );
  if (response.status === 404) return null;
  if (!response.ok || !data) throw await apiError(response, error);
  return data;
}

export const commentOnMyTicket = (
  id: string,
  requester: Requester,
  body: string,
  attachments?: Attachment[],
) =>
  unwrap(
    itsm().POST("/v1/itsm/requests/tickets/{id}/comments", {
      params: { path: { id } },
      body: { requesterId: requester.id, requesterName: requester.name, body, attachments },
    }),
  );

export const transitionMyTicket = (
  id: string,
  requester: Requester,
  transition: string,
) =>
  unwrap(
    itsm().POST("/v1/itsm/requests/tickets/{id}/transitions", {
      params: { path: { id } },
      body: {
        requesterId: requester.id,
        requesterName: requester.name,
        transition,
      },
    }),
  );
