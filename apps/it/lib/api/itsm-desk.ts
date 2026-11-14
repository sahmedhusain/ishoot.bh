

import type { components, paths } from "./generated/itsm";
import { apiTimeoutMs, apiUrl } from "./config";
import { apiError } from "./errors";
import { unwrap, unwrapEmpty, userClient } from "./http";

export type SLAPolicy = components["schemas"]["SLAPolicy"];
type Attachment = components["schemas"]["Attachment"];
export type QueueFilter = {
  status?: string;
  priority?: string;
  category?: string;
  assigneeId?: string;
  open?: boolean;
  cursor?: string;
  limit?: number;
};

const desk = (token: string) => userClient<paths>(token);

export const queueStats = (token: string) =>
  unwrap(desk(token).GET("/v1/itsm/desk/stats"));

export const listQueue = (token: string, query: QueueFilter = {}) =>
  unwrap(desk(token).GET("/v1/itsm/desk/tickets", { params: { query } }));

export async function getQueueTicket(token: string, id: string) {
  const { data, error, response } = await desk(token).GET(
    "/v1/itsm/desk/tickets/{id}",
    { params: { path: { id } } },
  );
  if (response.status === 404) return null;
  if (!response.ok || !data) throw await apiError(response, error);
  return data;
}

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

export const commentOnQueueTicket = (
  token: string,
  id: string,
  body: string,
  internal: boolean,
  attachments?: Attachment[],
) =>
  unwrap(
    desk(token).POST("/v1/itsm/desk/tickets/{id}/comments", {
      params: { path: { id } },
      body: { body, internal, attachments },
    }),
  );

export const listSLA = async (token: string) =>
  (await unwrap(desk(token).GET("/v1/itsm/desk/sla"))).items;

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

export type TicketLinks = {
  ticketId: string;
  employeeId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
  assetId?: string | null;
  documentId?: string | null;
  assetRef?: string | null;
};

export type StaffRef = {
  employeeId: string;
  userId?: string | null;
  employeeNumber: string;
  nameEn: string;
  nameAr: string;
  email: string;
  departmentId?: string | null;
  status: string;
  updatedAt: string;
};

export async function getTicketLinks(
  token: string,
  id: string,
): Promise<TicketLinks | null> {
  const res = await fetch(
    `${apiUrl()}/v1/itsm/desk/tickets/${encodeURIComponent(id)}/links`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(apiTimeoutMs()),
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function updateTicketLinks(
  token: string,
  id: string,
  body: Omit<Partial<TicketLinks>, "ticketId">,
): Promise<TicketLinks> {
  const res = await fetch(
    `${apiUrl()}/v1/itsm/desk/tickets/${encodeURIComponent(id)}/links`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(apiTimeoutMs()),
    },
  );
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listStaffRef(
  token: string,
  status = "",
): Promise<StaffRef[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${apiUrl()}/v1/itsm/desk/staff-ref${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw await apiError(res);
  return res.json();
}
