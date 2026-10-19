import { serverMessages } from "@ishoot/locales";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE_NAME = "ishoot_admin_session";

const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (
  !JWT_SECRET_STRING ||
  new TextEncoder().encode(JWT_SECRET_STRING).length < 32
) {
  throw new Error(serverMessages.jwtSecretMustContainAtLeast32);
}
const key = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SessionJwtPayload {
  userId: string;
  email: string;
  role: string;
  fullName: string;
}

export async function signSessionToken(
  payload: SessionJwtPayload,
  expiresIn = "7d",
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    if (!payload.userId || !payload.email || !payload.role) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      fullName: (payload.fullName as string) || "",
    };
  } catch {
    return null;
  }
}
