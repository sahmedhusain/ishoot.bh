import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING =
  process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-2026';
const key = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SessionJwtPayload {
  userId: string;
  email: string;
  role: string;
  fullName: string;
}

export async function signSessionToken(
  payload: SessionJwtPayload,
  expiresIn = '7d'
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    if (!payload.userId || !payload.email || !payload.role) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      fullName: (payload.fullName as string) || '',
    };
  } catch {
    return null;
  }
}
