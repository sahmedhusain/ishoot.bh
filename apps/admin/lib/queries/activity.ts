import { db } from "../atomic";
import { ActivityLog } from "../types";

const ACTIVITY_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapActivity(a: any): ActivityLog {
  return {
    id: a.id,
    user_id: a.userId,
    user: a.user
      ? {
          id: a.user.id,
          full_name: a.user.fullName,
          email: a.user.email,
          role: a.user.role as any,
          avatar_url: a.user.avatarUrl || undefined,
          created_at: a.user.createdAt.toISOString(),
          updated_at: a.user.updatedAt.toISOString(),
        }
      : undefined,
    action: a.action,
    entity_type: a.entityType,
    entity_id: a.entityId || undefined,
    details: a.details || undefined,
    diff_payload: a.diffPayload || undefined,
    ip_address: a.ipAddress || undefined,
    user_agent: a.userAgent || undefined,
    created_at: a.createdAt.toISOString(),
  };
}

export async function getActivityLogs(
  limit: number = 50,
): Promise<ActivityLog[]> {
  try {
    const logs = await db.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return logs.map(mapActivity);
  } catch (e) {
    console.error("Error fetching activity logs from DB:", e);
    throw e;
  }
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
  const created = await db.activityLog.create({
    data: {
      userId: data.user_id,
      action: data.action,
      entityType: data.entity_type,
      entityId: data.entity_id || null,
      details: data.details || null,
      diffPayload: data.diff_payload || null,
      ipAddress: data.ip_address || null,
      userAgent: data.user_agent || null,
    },
    include: { user: { select: ACTIVITY_USER_SELECT } },
  });
  return mapActivity(created);
}
