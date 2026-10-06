"use client";


export interface FunnelStage {
  label: string;
  count: number;
  color?: string;
}

interface LeadFunnelChartProps {
  stages: FunnelStage[];
}

export function LeadFunnelChart({ stages }: LeadFunnelChartProps) {
  if (!stages || stages.length === 0) return null;

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="w-full space-y-3">
      {stages.map((stage, idx) => {
        const pct = Math.round((stage.count / maxCount) * 100);

        return (
          <div key={stage.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white">{stage.label}</span>
              <span className="font-mono text-ink-muted">
                {stage.count} ({pct}%)
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: stage.color || "#09937F",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
