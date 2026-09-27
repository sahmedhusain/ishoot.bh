"use client";

import * as React from "react";

export interface CashFlowDataPoint {
  month: string;
  inflow: number;
  outflow: number;
}

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
  height?: number;
}

export function CashFlowChart({ data, height = 240 }: CashFlowChartProps) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap((d) => [d.inflow, d.outflow]), 1000);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-end gap-5 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#09937F]" />
          <span className="text-[#9EADA9]">Inflow (Revenue)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-rose-500/80" />
          <span className="text-[#9EADA9]">Outflow (Expenses)</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[500px]" style={{ height: `${height}px` }}>
          <svg
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${data.length * 80} 200`}
          >
            {[0, 50, 100, 150, 200].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2={data.length * 80}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
              />
            ))}

            {data.map((item, idx) => {
              const x = idx * 80 + 15;
              const inflowH = (item.inflow / maxVal) * 160;
              const outflowH = (item.outflow / maxVal) * 160;

              return (
                <g key={item.month} className="group">
                  <rect
                    x={x}
                    y={180 - inflowH}
                    width={22}
                    height={inflowH}
                    rx={4}
                    fill="#09937F"
                    className="transition-all duration-300 hover:opacity-80"
                  />
                  <rect
                    x={x + 26}
                    y={180 - outflowH}
                    width={22}
                    height={outflowH}
                    rx={4}
                    fill="#F43F5E"
                    fillOpacity={0.85}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                  <text
                    x={x + 24}
                    y={196}
                    textAnchor="middle"
                    fill="#9EADA9"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {item.month}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
