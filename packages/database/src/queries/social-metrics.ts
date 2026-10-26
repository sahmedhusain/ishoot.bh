import { db } from "../db";

export interface LatestSocialMetric {
  id: string;
  platform: string;
  metricType: string;
  value: number;
  recordedAt: Date;
  isStale: boolean;
  errorStatus: string | null;
}

/** The most recent reading of every platform/metric pair, in one query. */
export async function getLatestSocialMetrics(): Promise<LatestSocialMetric[]> {
  return db.$queryRaw<LatestSocialMetric[]>`
    SELECT DISTINCT ON ("platform", "metricType")
      "id", "platform", "metricType", "value", "recordedAt", "isStale", "errorStatus"
    FROM "SocialMetric" m
    WHERE m."sourceProvider" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "IntegrationSetting" i WHERE i."provider" = m."sourceProvider" AND i."isActive"
        AND i."config"->'socialAccounts'->>m."platform" = m."sourceAccountId"
        AND (i."config"->'availableMetrics'->m."platform") ? m."metricType"
    )
    ORDER BY "platform", "metricType", "recordedAt" DESC
  `;
}
