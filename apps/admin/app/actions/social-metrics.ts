"use server";
import { db, measureOperation } from "@ishoot/database";
import { requirePermission } from "../../lib/auth";

export async function fetchSocialMetrics() {
  return measureOperation("action:fetchSocialMetrics", async () => {
    await requirePermission("settings", "read");

    // Fetch the latest entry for each platform and metric type
    const metrics = await db.socialMetric.groupBy({
      by: ['platform', 'metricType'],
      _max: {
        recordedAt: true
      }
    });

    const results = [];
    for (const m of metrics) {
      if (m._max.recordedAt) {
        const latest = await db.socialMetric.findFirst({
          where: {
            platform: m.platform,
            metricType: m.metricType,
            recordedAt: m._max.recordedAt
          }
        });
        if (latest) results.push(latest);
      }
    }

    return { metrics: results };
  });
}
