// The itsm service (backend/services/itsm): IT tickets raised by employees. This app has already signed the
// employee in; the service trusts it to say who the requester is and shows them only their own tickets.
import type { components, paths } from "./generated/itsm";
import { apiError } from "./errors";
import { serviceClient } from "./http";

export type Ticket = components["schemas"]["Ticket"];
export type TicketDetail = components["schemas"]["TicketDetail"];
export type TicketComment = components["schemas"]["Comment"];
export type NewTicket = components["schemas"]["NewTicket"];
export type TicketPage = { items: Ticket[]; nextCursor?: string };
export type Requester = { id: string; name: string };

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const itsm = () => (client ??= serviceClient<paths>());

type Data<T> = { data?: T; error?: unknown; response: Response };
async function unwrap<T>(result: Promise<Data<T>>): Promise<T> {
  const { data, error, response } = await result;
  if (!response.ok || data === undefined) throw await apiError(response, error);
  return data;
}

/** Raises a ticket for an employee. Attachments must already be claimed in the files service. */
export const createTicket = (body: NewTicket) =>
  unwrap(itsm().POST("/v1/itsm/requests/tickets", { body }));

/** One page of an employee's tickets, newest first. */
export const listMyTickets = (
  requesterId: string,
  options: { status?: string; cursor?: string; limit?: number } = {},
): Promise<TicketPage> =>
  unwrap(
    itsm().GET("/v1/itsm/requests/tickets", {
      params: { query: { requesterId, ...options } },
    }),
  );

/** An employee's ticket with its public history, or null when it is not theirs. */
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

/** Adds an employee's comment to their open ticket. */
export const commentOnMyTicket = (
  id: string,
  requester: Requester,
  body: string,
) =>
  unwrap(
    itsm().POST("/v1/itsm/requests/tickets/{id}/comments", {
      params: { path: { id } },
      body: { requesterId: requester.id, requesterName: requester.name, body },
    }),
  );

/** Applies one of the requester transitions from the catalogue (provide_info, reopen, close, cancel). */
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
