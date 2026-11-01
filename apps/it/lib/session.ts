// The signed-in IT account, for server components and server actions. Never import from client components.
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { isApiError } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { config } from "./config";

export type ItUser = {
  subject: string;
  sessionId: string;
  roles: string[];
  email: string;
  /** The access token, for calls through the gateway (which checks it live against identity). */
  token: string;
};

let keys: ReturnType<typeof createRemoteJWKSet> | undefined;

/** The signed-in IT account, or null. The token's signature, issuer, audience and expiry are verified here. */
export async function currentUser(): Promise<ItUser | null> {
  const jar = await cookies();
  const token = jar.get(config.accessCookie())?.value;
  if (!token) return null;
  keys ??= createRemoteJWKSet(new URL(config.identityJwksUrl()));
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: config.identityIssuer(),
      audience: "platform:it",
    });
    if (payload.token_use !== "access" || typeof payload.sub !== "string")
      return null;
    return {
      subject: payload.sub,
      sessionId: String(payload.sid ?? ""),
      roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
      email: jar.get(config.accountCookie())?.value ?? "",
      token,
    };
  } catch {
    return null;
  }
}

/** The signed-in IT account; anyone else goes to the sign-in page. */
export async function requireUser(): Promise<ItUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** The signed-in IT account when their role allows the action; otherwise the forbidden page. */
export async function requireAllowed(
  resource: string,
  action: string,
): Promise<ItUser> {
  const user = await requireUser();
  if (!itAllowed(user.roles, resource, action)) forbidden();
  return user;
}

/** Runs a backend call as the user: an ended session signs them out, a denied one shows the forbidden page. */
export async function asUser<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (isApiError(error) && error.status === 401) redirect("/login");
    if (isApiError(error) && error.status === 403) forbidden();
    throw error;
  }
}
