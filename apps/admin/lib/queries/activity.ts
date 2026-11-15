import { listHRUsers } from "../api/hr";
import { createActivityLogApi, listActivityLogsApi } from "../api/system";
import { ActivityLog } from "../types";

function toIsoStringSafe(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function mapActivity(a: any, userById: Map<string, any>): ActivityLog {
  const user = a.userId ? userById.get(a.userId) : undefined;
  const detailsObj =
    a.details && typeof a.details === "object" && !Array.isArray(a.details)
      ? (a.details as Record<string, unknown>)
      : undefined;
  return {
    id: a.id,
    user_id: a.userId ?? "",
    user: user
      ? {
          id: user.id,
          full_name: user.fullName || user.email || a.userId,
          email: user.email || "",
          role: (user.role || "staff") as any,
          avatar_url: user.avatarUrl || undefined,
          created_at: toIsoStringSafe(user.createdAt),
          updated_at: toIsoStringSafe(user.updatedAt),
        }
      : undefined,
    action: a.action ?? "",
    entity_type: a.entityType ?? "",
    entity_id: a.entityId || undefined,
    details: a.details || undefined,
    diff_payload: a.diffPayload || undefined,
    ip_address:
      typeof detailsObj?.ip_address === "string"
        ? detailsObj.ip_address
        : undefined,
    user_agent:
      typeof detailsObj?.user_agent === "string"
        ? detailsObj.user_agent
        : undefined,
    created_at: toIsoStringSafe(detailsObj?.created_at ?? a.createdAt),
  };
}

export async function getActivityLogs(
  limit: number = 50,
): Promise<ActivityLog[]> {
  const [logs, users] = await Promise.all([
    listActivityLogsApi(limit),
    listHRUsers().catch(() => []),
  ]);
  const userById = new Map<string, any>(users.map((u: any): [any, any] => [u.id, u]));
  return logs.map((l) => mapActivity(l, userById));
}

export async function createActivityLog(data: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  diff_payload?: any;
  ip_address?: string;
  user_agent?: string;
}): Promise<ActivityLog> {
  const enrichedDetails =
    data.details && typeof data.details === "object" && !Array.isArray(data.details)
      ? {
          ...data.details,
          ...(data.ip_address ? { ip_address: data.ip_address } : {}),
          ...(data.user_agent ? { user_agent: data.user_agent } : {}),
          created_at: new Date().toISOString(),
        }
      : data.details ?? {
          ...(data.ip_address ? { ip_address: data.ip_address } : {}),
          ...(data.user_agent ? { user_agent: data.user_agent } : {}),
          created_at: new Date().toISOString(),
        };
  const [created, users] = await Promise.all([
    createActivityLogApi({
      userId: data.user_id,
      action: data.action,
      entityType: data.entity_type,
      entityId: data.entity_id || null,
      details: enrichedDetails,
      diffPayload: data.diff_payload || null,
    }),
    listHRUsers().catch(() => []),
  ]);
  const userById = new Map<string, any>(users.map((u: any): [any, any] => [u.id, u]));
  return mapActivity(created, userById);
}
