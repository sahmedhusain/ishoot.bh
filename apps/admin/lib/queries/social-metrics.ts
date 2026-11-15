import { listIntegrations } from "@platform/api-client";
import { listTableRows } from "../api/tables";

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
  const matchers: Array<{
    provider: string;
    platform: string;
    accountId: string;
    metrics: Set<string>;
  }> = [];

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
        matchers.push({
          provider: item.provider,
          platform,
          accountId,
          metrics: new Set(metrics),
        });
      }
    }
  }

  if (matchers.length === 0) return [];

  const rows = await listTableRows<any>("cms", "social_metric", "recorded_at DESC").catch(() => []);
  const latestByKey = new Map<string, LatestSocialMetric>();
  for (const m of rows) {
    const matched = matchers.some(
      (c) =>
        m.sourceProvider === c.provider &&
        m.platform === c.platform &&
        m.sourceAccountId === c.accountId &&
        c.metrics.has(m.metricType),
    );
    if (!matched) continue;
    const k = `${m.platform}|${m.metricType}`;
    if (!latestByKey.has(k)) {
      latestByKey.set(k, {
        id: m.id,
        platform: m.platform,
        metricType: m.metricType,
        value: Number(m.value ?? 0),
        recordedAt: new Date(m.recordedAt || Date.now()),
        isStale: !!m.isStale,
        errorStatus: m.errorStatus ?? null,
      });
    }
  }
  return Array.from(latestByKey.values());
}
