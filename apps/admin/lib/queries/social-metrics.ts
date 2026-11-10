import { Database } from "@platform/database/decimal";
import { listIntegrations } from "@platform/api-client";
import { db } from "../atomic";

export interface LatestSocialMetric {
  id: string;
  platform: string;
  metricType: string;
  value: number;
  recordedAt: Date;
  isStale: boolean;
  errorStatus: string | null;
}

export async function getLatestSocialMetrics(): Promise<LatestSocialMetric[]> {
  const integrations = await listIntegrations();
  const activeConditions: Database.Sql[] = [];

  for (const item of integrations) {
    if (!item.isActive) continue;
    const cfg = (item.config ?? {}) as Record<string, unknown>;
    const socialAccounts = (cfg.socialAccounts ?? {}) as Record<string, string>;
    const availableMetrics = (cfg.availableMetrics ?? {}) as Record<
      string,
      string[]
    >;
    for (const [platform, accountId] of Object.entries(socialAccounts)) {
      const metrics = availableMetrics[platform];
      if (accountId && Array.isArray(metrics) && metrics.length > 0) {
        activeConditions.push(
          Database.sql`(m."sourceProvider" = ${item.provider} AND m."platform" = ${platform} AND m."sourceAccountId" = ${accountId} AND m."metricType" IN (${Database.join(metrics)}))`,
        );
      }
    }
  }

  if (activeConditions.length === 0) return [];

  return db.$queryRaw<LatestSocialMetric[]>`
    SELECT DISTINCT ON ("platform", "metricType")
      "id", "platform", "metricType", "value", "recordedAt", "isStale", "errorStatus"
    FROM "SocialMetric" m
    WHERE ${Database.join(activeConditions, " OR ")}
    ORDER BY "platform", "metricType", "recordedAt" DESC
  `;
}
