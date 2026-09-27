import { db } from '../db';
import { Session, Profile, UserRole } from '../types';

function mapSession(s: any): Session {
  return {
    id: s.id,
    user_id: s.userId,
    token: s.token,
    ip_address: s.ipAddress || undefined,
    user_agent: s.userAgent || undefined,
    expires_at: s.expiresAt.toISOString(),
    created_at: s.createdAt.toISOString(),
    user: s.user
      ? {
          id: s.user.id,
          full_name: s.user.fullName,
          email: s.user.email,
          role: s.user.role as UserRole,
          avatar_url: s.user.avatarUrl || undefined,
          phone: s.user.phone || undefined,
          department: s.user.department || undefined,
          is_active: s.user.isActive,
          permissions: s.user.permissions || undefined,
          created_at: s.user.createdAt.toISOString(),
          updated_at: s.user.updatedAt.toISOString(),
        }
      : undefined,
  };
}

export async function createSession(data: {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}): Promise<Session> {
  const session = await db.session.create({
    data: {
      userId: data.userId,
      token: data.token,
      expiresAt: data.expiresAt,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    },
    include: {
      user: true,
    },
  });

  return mapSession(session);
}

export async function getSessionByToken(token: string): Promise<(Session & { user: Profile }) | null> {
  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;

    // Check expiration
    if (new Date() > session.expiresAt) {
      // Invalidate expired session asynchronously
      db.session.delete({ where: { token } }).catch(() => {});
      return null;
    }

    if (!session.user || !session.user.isActive) {
      return null;
    }

    return mapSession(session) as Session & { user: Profile };
  } catch (err) {
    console.error('Error fetching session by token:', err);
    return null;
  }
}

export async function deleteSession(token: string): Promise<boolean> {
  try {
    await db.session.delete({ where: { token } });
    return true;
  } catch (err) {
    console.error('Error deleting session:', err);
    return false;
  }
}

export async function deleteUserSessions(userId: string): Promise<boolean> {
  try {
    await db.session.deleteMany({ where: { userId } });
    return true;
  } catch (err) {
    console.error('Error deleting user sessions:', err);
    return false;
  }
}

export async function getAllActiveSessions(): Promise<Session[]> {
  try {
    const sessions = await db.session.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(mapSession);
  } catch (err) {
    console.error('Error fetching active sessions:', err);
    return [];
  }
}

export async function cleanExpiredSessions(): Promise<number> {
  try {
    const res = await db.session.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
    return res.count;
  } catch (err) {
    console.error('Error cleaning expired sessions:', err);
    return 0;
  }
}
