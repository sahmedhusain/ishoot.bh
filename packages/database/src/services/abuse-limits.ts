import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { db } from "../db";
export function trustedClientIp(headers: Headers): string | undefined {
  // Only configure a header that a private ingress overwrites and cannot be bypassed.
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!header) return;
  if (!/^[a-z0-9-]{1,80}$/.test(header)) throw new Error("Invalid trusted client IP header configuration");
  const value = headers.get(header)?.trim();
  return value && isIP(value) ? value : undefined;
}
export async function consumeAbuseLimit(scope: string, identifier: string, limit: number, seconds = 60) {
  const key = scope + ":" + createHash("sha256").update(identifier).digest("hex");
  const [state] = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "AbuseWindow" (key,count,"expiresAt") VALUES (${key},1,CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second')
    ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "AbuseWindow"."expiresAt"<=CURRENT_TIMESTAMP THEN 1 ELSE LEAST("AbuseWindow".count+1,${limit + 1}) END,
    "expiresAt"=CASE WHEN "AbuseWindow"."expiresAt"<=CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second' ELSE "AbuseWindow"."expiresAt" END
    RETURNING count
  `;
  if (state.count > limit) throw new Error("RATE_LIMIT");
}
