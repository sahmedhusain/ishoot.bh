"use client";
import {
ResponsiveContainer,
BarChart,
Bar,
XAxis,
YAxis,
Tooltip,
CartesianGrid
} from "recharts";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export default function DashboardCashflowChart({ data: cashflowData }: { data: Array<{ month?: string; name?: string; revenue: number; expenses: number }> }) {
  const { t } = useAdminLocale();
  return (<ResponsiveContainer width="100%" height="100%">
              <BarChart accessibilityLayer
                data={cashflowData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis
                  dataKey="month"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    borderColor: "#3c4043",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#FFF",
                  }}
                  formatter={(value: any) => [
                    `${Number(value).toFixed(3)} BHD`,
                    "",
                  ]}
                />
                <Bar
                  dataKey="revenue"
                  fill="#09937F"
                  radius={[4, 4, 0, 0]}
                  name={t.dashboardView.revenue}
                />
                <Bar
                  dataKey="expenses"
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                  name={t.dashboardView.expenses}
                />
              </BarChart>
            </ResponsiveContainer>);
}
