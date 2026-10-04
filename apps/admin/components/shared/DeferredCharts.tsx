"use client";
import { CashFlowChart } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";

type CashflowPoint = { month?: string; name?: string; revenue: number; expenses: number };

export function DeferredCashflowChart({ data }: { kind: "dashboard" | "finance"; data: CashflowPoint[] }) {
  const { t, isRTL } = useAdminLocale();
  const points = data.map((row) => ({ month: row.month || row.name || "", inflow: row.revenue, outflow: row.expenses }));
  return <div className="h-full w-full flex flex-col">
    <div className="flex-1 min-h-0">
      <CashFlowChart data={points} inflowLabel={t.dashboardView.revenue} outflowLabel={t.dashboardView.expenses} />
    </div>
    <details className="text-xs"><summary>{isRTL ? "عرض بيانات الرسم" : "View chart data"}</summary><table><thead><tr><th>{isRTL ? "الشهر" : "Month"}</th><th>{isRTL ? "الإيراد (BHD)" : "Revenue (BHD)"}</th><th>{isRTL ? "المصروف (BHD)" : "Expenses (BHD)"}</th></tr></thead><tbody>{data.map((row, i) => <tr key={i}><td>{row.month || row.name}</td><td>{row.revenue}</td><td>{row.expenses}</td></tr>)}</tbody></table></details>
  </div>;
}
