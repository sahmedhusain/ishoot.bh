import { serviceFetch } from "./service-fetch";

export type WorkspacePrefs = {
  userId: string;
  widgets: unknown;
  scratchpad: Record<string, unknown>;
  sidebarPrefs: Record<string, unknown>;
  updatedAt?: string;
};

export type WorkspaceLayoutRow = {
  userId: string;
  widgets: unknown;
};

export const getWorkspacePrefsApi = (userId: string, token?: string) =>
  serviceFetch<WorkspacePrefs>(
    `/v1/system/workspace/prefs/${encodeURIComponent(userId)}`,
    {},
    token,
  );

export const putWorkspacePrefsApi = (
  userId: string,
  input: {
    widgets?: unknown;
    scratchpad?: Record<string, unknown>;
    sidebarPrefs?: Record<string, unknown>;
  },
  token?: string,
) =>
  serviceFetch<WorkspacePrefs>(
    `/v1/system/workspace/prefs/${encodeURIComponent(userId)}`,
    { method: "PUT", body: JSON.stringify(input) },
    token,
  );

export const resetWorkspaceLayoutApi = (
  userId: string,
  widgets: unknown = [],
  token?: string,
) =>
  serviceFetch<void>(
    `/v1/system/workspace/prefs/${encodeURIComponent(userId)}/layout`,
    { method: "DELETE", body: JSON.stringify({ widgets }) },
    token,
  );

export const listWorkspaceFoldersApi = async (
  token?: string,
): Promise<WorkspaceLayoutRow[]> => {
  const res = await serviceFetch<{ items: WorkspaceLayoutRow[] }>(
    "/v1/system/workspace/folders",
    {},
    token,
  );
  return res?.items ?? [];
};

export type ActivityLogItem = {
  id: string;
  userId?: string | null;
  action?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: unknown;
  diffPayload?: unknown;
};

export const listActivityLogsApi = async (
  limit = 50,
  token?: string,
): Promise<ActivityLogItem[]> => {
  const res = await serviceFetch<{ items: ActivityLogItem[] }>(
    `/v1/system/activity-logs?limit=${encodeURIComponent(String(limit))}`,
    {},
    token,
  );
  return res?.items ?? [];
};

export const createActivityLogApi = (
  input: Partial<ActivityLogItem>,
  token?: string,
) =>
  serviceFetch<ActivityLogItem>(
    "/v1/system/activity-logs",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export type LegalMatterItem = {
  id: string;
  number?: string | null;
  title?: string | null;
  kind?: string | null;
  status?: string | null;
  counterparty?: string | null;
  reference?: string | null;
  nextDate?: string | null;
  assigneeId?: string | null;
  amountAtStake?: number | null;
  description?: string | null;
  outcome?: string | null;
  createdById?: string | null;
  closedAt?: string | null;
  remindedFor?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const listLegalMattersApi = async (
  token?: string,
): Promise<LegalMatterItem[]> => {
  const res = await serviceFetch<{ items: LegalMatterItem[] }>(
    "/v1/system/legal-matters",
    {},
    token,
  );
  return res?.items ?? [];
};

export const getLegalMatterApi = (id: string, token?: string) =>
  serviceFetch<LegalMatterItem>(
    `/v1/system/legal-matters/${encodeURIComponent(id)}`,
    {},
    token,
  );

export const createLegalMatterApi = (
  input: Partial<LegalMatterItem>,
  token?: string,
) =>
  serviceFetch<LegalMatterItem>(
    "/v1/system/legal-matters",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const updateLegalMatterApi = (
  id: string,
  input: Partial<LegalMatterItem>,
  token?: string,
) =>
  serviceFetch<LegalMatterItem>(
    `/v1/system/legal-matters/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(input) },
    token,
  );

export const deleteLegalMatterApi = (id: string, token?: string) =>
  serviceFetch<void>(
    `/v1/system/legal-matters/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );

export const listReportSchedulesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/report-schedules", {}, token);

export const listCompanyDocumentsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/company-documents", {}, token);

export const listServiceSettingsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/service-settings", {}, token);

export const listRevalidationJobsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/revalidation-jobs", {}, token);

export const listAnnouncementsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/announcements", {}, token);

export const listAnnouncementReceiptsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/announcement-receipts", {}, token);

export const listBroadcastsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/broadcasts", {}, token);

export const listBroadcastRecipientsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/broadcast-recipients", {}, token);

export const listCommunicationSettingsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/communication-settings", {}, token);

export const listEmailJobsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/email-jobs", {}, token);

export const listCommunicationThreadsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/communication-threads", {}, token);

export const listCommunicationMessagesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/communication-messages", {}, token);

export const listDocumentTemplatesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/document-templates", {}, token);

export const listGeneratedDocumentsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/generated-documents", {}, token);

export const listBackupRecordsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/backup-records", {}, token);

export const listSystemCannedRepliesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/canned-replies", {}, token);

export const listSystemHrPoliciesApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/hr-policies", {}, token);

export const listSystemPublicHolidaysApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/public-holidays", {}, token);

export const listSystemFinalSettlementsApi = (token?: string) =>
  serviceFetch<any[]>("/v1/system/final-settlements", {}, token);

export const saveSystemHrPolicyApi = (input: Record<string, any>, token?: string) =>
  serviceFetch<any>("/v1/system/hr-policies", { method: "PUT", body: JSON.stringify(input) }, token);

export const saveSystemPublicHolidayApi = (
  input: { id?: string | null; date: string; nameEn: string; nameAr: string },
  token?: string,
) =>
  serviceFetch<any>("/v1/system/public-holidays", { method: "POST", body: JSON.stringify(input) }, token);

export const deleteSystemPublicHolidayApi = (id: string, token?: string) =>
  serviceFetch<void>(`/v1/system/public-holidays/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
