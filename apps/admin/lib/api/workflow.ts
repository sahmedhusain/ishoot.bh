import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";

export type ApprovalRequest = {
  id: string;
  kind: string;
  entityId: string;
  requesterId: string;
  status: string;
  priority: string;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalDecision = {
  id: string;
  requestId: string;
  approverId: string;
  decision: string;
  comments?: string | null;
  decidedAt: string;
};

export type ApprovalRequestWithDecisions = ApprovalRequest & {
  decisions: ApprovalDecision[];
};

export type SignatureRequest = {
  id: string;
  title: string;
  documentType: string;
  documentId: string;
  requestedFrom: string;
  status: string;
  signatureUrl?: string | null;
  signedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  status: string;
  priority: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string | null;
  organizerId: string;
  eventType: string;
  createdAt: string;
};

async function workflowFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    const st = await serviceToken();
    if (st) headers.set("Authorization", `Bearer ${st}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      // non-JSON
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

// Approvals
export const listApprovals = (token?: string) =>
  workflowFetch<ApprovalRequest[]>("/v1/workflow/approvals", {}, token);

export const getApprovalRequest = (id: string, token?: string) =>
  workflowFetch<ApprovalRequestWithDecisions>(`/v1/workflow/approvals/${encodeURIComponent(id)}`, {}, token);

export const createApprovalRequest = (input: Partial<ApprovalRequest>, token?: string) =>
  workflowFetch<ApprovalRequest>("/v1/workflow/approvals", { method: "POST", body: JSON.stringify(input) }, token);

export const decideApproval = (id: string, decision: "approve" | "reject", comments?: string, token?: string) =>
  workflowFetch<ApprovalDecision>(`/v1/workflow/approvals/${encodeURIComponent(id)}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision, comments }),
  }, token);

// Signatures
export const listSignatures = (token?: string) =>
  workflowFetch<SignatureRequest[]>("/v1/workflow/signatures", {}, token);

export const createSignatureRequest = (input: Partial<SignatureRequest>, token?: string) =>
  workflowFetch<SignatureRequest>("/v1/workflow/signatures", { method: "POST", body: JSON.stringify(input) }, token);

export const recordSignature = (id: string, signatureUrl: string, token?: string) =>
  workflowFetch<SignatureRequest>(`/v1/workflow/signatures/${encodeURIComponent(id)}/sign`, {
    method: "POST",
    body: JSON.stringify({ signatureUrl }),
  }, token);

// Tasks
export const listTasks = (token?: string) =>
  workflowFetch<Task[]>("/v1/workflow/tasks", {}, token);

export const createTask = (input: Partial<Task>, token?: string) =>
  workflowFetch<Task>("/v1/workflow/tasks", { method: "POST", body: JSON.stringify(input) }, token);

export const updateTaskStatus = (id: string, status: string, token?: string) =>
  workflowFetch<Task>(`/v1/workflow/tasks/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }, token);

// Calendar
export const listCalendarEvents = (token?: string) =>
  workflowFetch<CalendarEvent[]>("/v1/workflow/calendar", {}, token);

export const createCalendarEvent = (input: Partial<CalendarEvent>, token?: string) =>
  workflowFetch<CalendarEvent>("/v1/workflow/calendar", { method: "POST", body: JSON.stringify(input) }, token);

// Minutes of Meeting (MOM)
export type MinuteOfMeeting = {
  id: string;
  momNumber: string;
  title: string;
  meetingDate: string;
  attendees: string[];
  discussion: string;
  actionItems?: string | null;
  status: string;
  createdAt: string;
};

export const listMOMs = (token?: string) =>
  workflowFetch<MinuteOfMeeting[]>("/v1/workflow/moms", {}, token);

export const getMOM = (id: string, token?: string) =>
  workflowFetch<MinuteOfMeeting>(`/v1/workflow/moms/${encodeURIComponent(id)}`, {}, token);

export const createMOM = (input: any, token?: string) =>
  workflowFetch<MinuteOfMeeting>("/v1/workflow/moms", { method: "POST", body: JSON.stringify(input) }, token);

export const updateMOM = (id: string, input: any, token?: string) =>
  workflowFetch<MinuteOfMeeting>(`/v1/workflow/moms/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

// Official Letters & Templates
export type LetterTemplate = {
  id: string;
  nameEn: string;
  nameAr: string;
  templateBody: string;
  sortOrder: number;
};

export type OfficialLetter = {
  id: string;
  letterNumber: string;
  templateId?: string | null;
  recipientName: string;
  recipientTitle?: string | null;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
};

export const listLetterTemplates = (token?: string) =>
  workflowFetch<LetterTemplate[]>("/v1/workflow/letter-templates", {}, token);

export const createLetterTemplate = (input: any, token?: string) =>
  workflowFetch<LetterTemplate>("/v1/workflow/letter-templates", { method: "POST", body: JSON.stringify(input) }, token);

export const listOfficialLetters = (token?: string) =>
  workflowFetch<OfficialLetter[]>("/v1/workflow/letters", {}, token);

export const getOfficialLetter = (id: string, token?: string) =>
  workflowFetch<OfficialLetter>(`/v1/workflow/letters/${encodeURIComponent(id)}`, {}, token);

export const createOfficialLetter = (input: any, token?: string) =>
  workflowFetch<OfficialLetter>("/v1/workflow/letters", { method: "POST", body: JSON.stringify(input) }, token);

export const issueOfficialLetter = (id: string, token?: string) =>
  workflowFetch<OfficialLetter>(`/v1/workflow/letters/${encodeURIComponent(id)}/issue`, { method: "POST" }, token);
