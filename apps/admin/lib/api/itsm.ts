import type { components, paths } from "./generated/itsm";
import { apiError } from "./errors";
import { serviceClient, unwrap } from "./http";
import { buildQuery, serviceFetch } from "./service-fetch";

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

export type TicketEntityLinks = {
  ticketId: string;
  employeeId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
  assetId?: string | null;
  documentId?: string | null;
  assetRef?: string | null;
};

export type ITAsset = {
  id: string;
  assetTag: string;
  categoryId?: string | null;
  categoryName?: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  currency?: string | null;
  supplier?: string | null;
  invoiceReference?: string | null;
  warrantyUntil?: string | null;
  condition: string;
  status: string;
  specs?: Record<string, unknown>;
};

export type ITAssetHandover = {
  id: string;
  reference: string;
  assetId: string;
  assetTag?: string;
  assetName?: string;
  employeeId: string;
  employeeName?: string;
  kind: string;
  status: string;
  handoverDate?: string | null;
  condition?: string | null;
};

export const getTicketEntityLinks = (id: string, token?: string) =>
  serviceFetch<TicketEntityLinks>(`/v1/itsm/requests/tickets/${encodeURIComponent(id)}/links`, {}, token);

export const updateTicketEntityLinks = (id: string, links: Partial<TicketEntityLinks>, token?: string) =>
  serviceFetch<TicketEntityLinks>(`/v1/itsm/requests/tickets/${encodeURIComponent(id)}/links`, {
    method: "PUT",
    body: JSON.stringify(links),
  }, token);

export const listITAssets = (filters?: { status?: string; categoryId?: string }, token?: string) =>
  serviceFetch<ITAsset[]>(`/v1/itsm/requests/assets${buildQuery(filters)}`, {}, token);

export const saveITAsset = (input: Partial<ITAsset>, token?: string) =>
  serviceFetch<ITAsset>(
    input.id ? `/v1/itsm/requests/assets/${encodeURIComponent(input.id)}` : "/v1/itsm/requests/assets",
    { method: input.id ? "PUT" : "POST", body: JSON.stringify(input) },
    token,
  );

export const deleteITAsset = (id: string, token?: string) =>
  serviceFetch<void>(`/v1/itsm/requests/assets/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listITAssetHandovers = (filters?: { assetId?: string; employeeId?: string }, token?: string) =>
  serviceFetch<ITAssetHandover[]>(`/v1/itsm/requests/asset-handovers${buildQuery(filters)}`, {}, token);

export const saveITAssetHandover = (input: Partial<ITAssetHandover>, token?: string) =>
  serviceFetch<ITAssetHandover>(
    input.id ? `/v1/itsm/requests/asset-handovers/${encodeURIComponent(input.id)}` : "/v1/itsm/requests/asset-handovers",
    { method: input.id ? "PUT" : "POST", body: JSON.stringify(input) },
    token,
  );

export const listAssetCategories = (token?: string) =>
  serviceFetch<any[]>("/v1/itsm/requests/asset-categories", {}, token);

export const listSupportProgramsItsmApi = (token?: string) =>
  serviceFetch<any[]>("/v1/itsm/requests/support-programs", {}, token);

export const listSupportReimbursementsItsmApi = (token?: string) =>
  serviceFetch<any[]>("/v1/itsm/requests/support-reimbursements", {}, token);
