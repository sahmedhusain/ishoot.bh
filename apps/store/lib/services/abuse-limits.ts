import { serverMessages } from "@platform/locales";
import { createHash } from "node:crypto";
import { isIP } from "node:net";

const windows = new Map<string, { count: number; expiresAt: number }>();

function pruneExpired(now: number) {
  if (windows.size <= 5000) return;
  for (const [k, entry] of windows.entries()) {
    if (entry.expiresAt <= now) {
      windows.delete(k);
    }
  }
}

export function trustedClientIp(headers: Headers): string | undefined {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!header) return;
  if (!/^[a-z0-9-]{1,80}$/.test(header)) {
    throw new Error(serverMessages.invalidTrustedClientIpHeaderConfiguration);
  }
  const value = headers.get(header)?.trim();
  return value && isIP(value) ? value : undefined;
}

export async function consumeAbuseLimit(
  scope: string,
  identifier: string,
  limit: number,
  seconds = 60,
) {
  const now = Date.now();
  pruneExpired(now);
  const key =
    scope + ":" + createHash("sha256").update(identifier).digest("hex");
  const existing = windows.get(key);
  let nextCount = 1;
  let expiresAt = now + seconds * 1000;

  if (existing && existing.expiresAt > now) {
    nextCount = Math.min(existing.count + 1, limit + 1);
    expiresAt = existing.expiresAt;
  }

  windows.set(key, { count: nextCount, expiresAt });
  if (nextCount > limit) {
    throw new Error(serverMessages.rateLimit);
  }
}
