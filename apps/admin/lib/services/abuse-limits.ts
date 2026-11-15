import { serverMessages } from "@platform/locales";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { listTableRows, upsertTableRow } from "../api/tables";
export function trustedClientIp(headers: Headers): string | undefined {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!header) return;
  if (!/^[a-z0-9-]{1,80}$/.test(header))
    throw new Error(serverMessages.invalidTrustedClientIpHeaderConfiguration);
  const value = headers.get(header)?.trim();
  return value && isIP(value) ? value : undefined;
}
export async function consumeAbuseLimit(
  scope: string,
  identifier: string,
  limit: number,
  seconds = 60,
) {
  const key =
    scope + ":" + createHash("sha256").update(identifier).digest("hex");
  const now = Date.now();
  const rows = await listTableRows<any>("system", "abuse_window").catch(() => []);
  const existing = rows.find((r) => r.key === key || r.id === key);
  const expired = !existing || new Date(existing.expiresAt || 0).getTime() <= now;
  const count = expired ? 1 : Math.min(Number(existing.count ?? 0) + 1, limit + 1);
  const expiresAt = expired
    ? new Date(now + seconds * 1000).toISOString()
    : existing.expiresAt;
  await upsertTableRow("system", "abuse_window", {
    ...(existing || {}),
    id: existing?.id ?? key,
    key,
    count,
    expiresAt,
  });
  if (count > limit) throw new Error(serverMessages.rateLimit);
}
