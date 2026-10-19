"use client";
import { CashFlowChart } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";

type CashflowPoint = { month?: string; name?: string; revenue: number; expenses: number };

export function DeferredCashflowChart({ data }: { kind: "dashboard" | "finance"; data: CashflowPoint[] }) {
  const {t} = useAdminLocale();
  const points = data.map((row) => ({ month: row.month || row.name || "", inflow: row.revenue, outflow: row.expenses }));
  return <div className="h-full w-full flex flex-col">
    <div className="flex-1 min-h-0">
      <CashFlowChart data={points} inflowLabel={t.dashboardView.revenue} outflowLabel={t.dashboardView.expenses} />
    </div>
    <details className="text-xs"><summary>{t.deferredCharts.viewChartData}</summary><table><thead><tr><th>{t.deferredCharts.month}</th><th>{t.deferredCharts.revenueBhd}</th><th>{t.deferredCharts.expensesBhd}</th></tr></thead><tbody>{data.map((row, i) => <tr key={i}><td>{row.month || row.name}</td><td>{row.revenue}</td><td>{row.expenses}</td></tr>)}</tbody></table></details>
  </div>;
}
