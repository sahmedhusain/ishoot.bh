import React from "react";
import { fetchSocialMetrics } from "../../actions/social-metrics";

export default async function AnalyticsDashboard() {
  const { metrics } = await fetchSocialMetrics();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Social Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-white p-4 rounded shadow border">
            <h3 className="text-sm text-gray-500 uppercase">{metric.platform}</h3>
            <div className="text-lg font-semibold capitalize">{metric.metricType.replace('_', ' ')}</div>
            <div className="text-3xl font-bold mt-2">
              {metric.errorStatus ? <span className="text-red-500 text-sm">{metric.errorStatus}</span> : metric.value}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {metric.isStale ? "Stale Data" : "Fresh"} • Updated {new Date(metric.recordedAt).toLocaleString()}
            </div>
          </div>
        ))}
        {metrics.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500">
            No analytics data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
