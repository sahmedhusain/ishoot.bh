import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";
import { buildQuery } from "./service-fetch";

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
  projectId?: string | null;
  departmentId?: string | null;
  momId?: string | null;
  clientId?: string | null;
  dealId?: string | null;
  employeeId?: string | null;
  documentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DirectoryRef = {
  kind: string;
  id: string;
  name: string;
  email?: string | null;
  departmentId?: string | null;
  company?: string | null;
  status?: string | null;
};

export type MomAttendee = {
  id: string;
  momId: string;
  attendeeType: string;
  employeeId?: string | null;
  contactId?: string | null;
  externalName?: string | null;
  externalEmail?: string | null;
  role?: string | null;
  attendanceStatus?: string | null;
};

export type MomActionItem = {
  id: string;
  momId: string;
  taskId?: string | null;
  title: string;
  description?: string | null;
  assigneeEmployeeId?: string | null;
  assigneeUserId?: string | null;
  departmentId?: string | null;
  dueDate?: string | null;
  status: string;
};

export type MomFilters = {
  clientId?: string;
  dealId?: string;
  projectId?: string;
  departmentId?: string;
  teamId?: string;
  status?: string;
};

export type TaskFilters = {
  projectId?: string;
  departmentId?: string;
  momId?: string;
  clientId?: string;
  dealId?: string;
  assignedTo?: string;
  status?: string;
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
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return normalizeApiRecord(JSON.parse(text)) as T;
}

export type DocumentRelationFilters = {
  clientId?: string;
  dealId?: string;
  projectId?: string;
  employeeId?: string;
  departmentId?: string;
  documentId?: string;
  status?: string;
};

export type WorkflowContract = {
  id: string;
  contractNumber: string;
  title: string;
  contractType: string;
  status: string;
  clientId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  employeeId?: string | null;
  departmentId?: string | null;
  documentId?: string | null;
  fileUrl?: string | null;
  value?: number | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  signedAt?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const listApprovals = (tokenOrFilters?: string | DocumentRelationFilters, token?: string) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return workflowFetch<ApprovalRequest[]>(`/v1/workflow/approvals${buildQuery(filters)}`, {}, auth);
};

export const getApprovalRequest = (id: string, token?: string) =>
  workflowFetch<ApprovalRequestWithDecisions>(`/v1/workflow/approvals/${encodeURIComponent(id)}`, {}, token);

export const createApprovalRequest = (input: Partial<ApprovalRequest> & DocumentRelationFilters & { fileUrl?: string; createdById?: string }, token?: string) =>
  workflowFetch<ApprovalRequest>("/v1/workflow/approvals", { method: "POST", body: JSON.stringify(input) }, token);

export const decideApproval = (id: string, decision: "approve" | "reject", comments?: string, token?: string) =>
  workflowFetch<ApprovalDecision>(`/v1/workflow/approvals/${encodeURIComponent(id)}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision, comments }),
  }, token);

export const listSignatures = (tokenOrFilters?: string | DocumentRelationFilters, token?: string) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return workflowFetch<SignatureRequest[]>(`/v1/workflow/signatures${buildQuery(filters)}`, {}, auth);
};

export const createSignatureRequest = (input: Partial<SignatureRequest> & DocumentRelationFilters & { fileUrl?: string; createdById?: string }, token?: string) =>
  workflowFetch<SignatureRequest>("/v1/workflow/signatures", { method: "POST", body: JSON.stringify(input) }, token);

export const recordSignature = (id: string, signatureUrl: string, token?: string) =>
  workflowFetch<SignatureRequest>(`/v1/workflow/signatures/${encodeURIComponent(id)}/sign`, {
    method: "POST",
    body: JSON.stringify({ signatureUrl }),
  }, token);

export const listTasks = (
  tokenOrFilters?: string | TaskFilters,
  token?: string,
) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return workflowFetch<Task[]>(`/v1/workflow/tasks${buildQuery(filters)}`, {}, auth);
};

export const createTask = (input: Partial<Task>, token?: string) =>
  workflowFetch<Task>("/v1/workflow/tasks", { method: "POST", body: JSON.stringify(input) }, token);

export const updateTask = (id: string, input: Partial<Task>, token?: string) =>
  workflowFetch<Task>(`/v1/workflow/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);

export const deleteTask = (id: string, token?: string) =>
  workflowFetch<void>(`/v1/workflow/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, token);

export const updateTaskStatus = (id: string, status: string, token?: string) =>
  workflowFetch<Task>(`/v1/workflow/tasks/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }, token);

export const listCalendarEvents = (tokenOrFilters?: string | DocumentRelationFilters, token?: string) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return workflowFetch<CalendarEvent[]>(`/v1/workflow/calendar${buildQuery(filters)}`, {}, auth);
};

export const createCalendarEvent = (input: Partial<CalendarEvent> & DocumentRelationFilters & { fileUrl?: string; createdById?: string }, token?: string) =>
  workflowFetch<CalendarEvent>("/v1/workflow/calendar", { method: "POST", body: JSON.stringify(input) }, token);

export type MinuteOfMeeting = {
  id: string;
  momNumber: string;
  title: string;
  meetingDate: string;
  attendees: string[];
  discussion: string;
  actionItems?: string | null;
  status: string;
  clientId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  organizerId?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  location?: string | null;
  meetingType?: string | null;
  decisions?: unknown;
  attendeeRecords?: MomAttendee[];
  actionItemRecords?: MomActionItem[];
  createdAt: string;
  updatedAt?: string;
};

export const listMOMs = (
  tokenOrFilters?: string | MomFilters,
  token?: string,
) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return workflowFetch<MinuteOfMeeting[]>(`/v1/workflow/moms${buildQuery(filters)}`, {}, auth);
};

export const getMOM = (id: string, token?: string) =>
  workflowFetch<MinuteOfMeeting>(`/v1/workflow/moms/${encodeURIComponent(id)}`, {}, token);

export const createMOM = (input: any, token?: string) =>
  workflowFetch<MinuteOfMeeting>("/v1/workflow/moms", { method: "POST", body: JSON.stringify(input) }, token);

export const updateMOM = (id: string, input: any, token?: string) =>
  workflowFetch<MinuteOfMeeting>(`/v1/workflow/moms/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deleteMOM = (id: string, token?: string) =>
  workflowFetch<void>(`/v1/workflow/moms/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listDirectoryRefs = (kind?: string, token?: string) =>
  workflowFetch<DirectoryRef[]>(`/v1/workflow/directory${buildQuery({ kind })}`, {}, token);

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

export const listOfficialLetters = (tokenOrFilters?: string | DocumentRelationFilters, token?: string) => {
  const filters = typeof tokenOrFilters === "object" ? tokenOrFilters : undefined;
  const auth = typeof tokenOrFilters === "string" ? tokenOrFilters : token;
  return workflowFetch<OfficialLetter[]>(`/v1/workflow/letters${buildQuery(filters)}`, {}, auth);
};

export const getOfficialLetter = (id: string, token?: string) =>
  workflowFetch<OfficialLetter>(`/v1/workflow/letters/${encodeURIComponent(id)}`, {}, token);

export const createOfficialLetter = (input: any, token?: string) =>
  workflowFetch<OfficialLetter>("/v1/workflow/letters", { method: "POST", body: JSON.stringify(input) }, token);

export const issueOfficialLetter = (id: string, token?: string) =>
  workflowFetch<OfficialLetter>(`/v1/workflow/letters/${encodeURIComponent(id)}/issue`, { method: "POST" }, token);

export const listContracts = (filters?: DocumentRelationFilters, token?: string) =>
  workflowFetch<WorkflowContract[]>(`/v1/workflow/contracts${buildQuery(filters)}`, {}, token);

export const getContract = (id: string, token?: string) =>
  workflowFetch<WorkflowContract>(`/v1/workflow/contracts/${encodeURIComponent(id)}`, {}, token);

export const createContract = (input: Partial<WorkflowContract>, token?: string) =>
  workflowFetch<WorkflowContract>("/v1/workflow/contracts", { method: "POST", body: JSON.stringify(input) }, token);

export const updateContract = (id: string, input: Partial<WorkflowContract>, token?: string) =>
  workflowFetch<WorkflowContract>(`/v1/workflow/contracts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);

export const deleteContract = (id: string, token?: string) =>
  workflowFetch<void>(`/v1/workflow/contracts/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listApprovalPolicies = (token?: string) =>
  workflowFetch<any[]>("/v1/system/tables/approval_policy", {}, token);

export const listApprovalPolicySteps = (token?: string) =>
  workflowFetch<any[]>("/v1/system/tables/approval_policy_step", {}, token);

export const listSignaturePolicies = (token?: string) =>
  workflowFetch<any[]>("/v1/system/tables/signature_policy", {}, token);

export const listCalendarFeedTokens = (token?: string) =>
  workflowFetch<any[]>("/v1/system/tables/calendar_feed_token", {}, token);
