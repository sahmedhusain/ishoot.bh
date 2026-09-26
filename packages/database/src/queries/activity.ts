import { db } from '../db';
import { ActivityLog } from '../types';

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
    ip_address: a.ipAddress || undefined,
    created_at: a.createdAt.toISOString(),
  };
}

export async function getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
  try {
    const logs = await db.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs.map(mapActivity);
  } catch (e) {
    console.error('Error fetching activity logs from DB:', e);
    return [];
  }
}

export async function createActivityLog(data: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
}): Promise<ActivityLog> {
  const created = await db.activityLog.create({
    data: {
      userId: data.user_id,
      action: data.action,
      entityType: data.entity_type,
      entityId: data.entity_id || null,
      details: data.details || null,
      ipAddress: data.ip_address || null,
    },
    include: { user: true },
  });
  return mapActivity(created);
}
