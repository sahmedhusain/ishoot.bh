"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
const DashboardChart = dynamic(() => import("./DashboardCashflowChart"), { ssr: false });
const FinanceChart = dynamic(() => import("./FinanceCashflowChart"), { ssr: false });
export function DeferredCashflowChart({ kind, data }: { kind: "dashboard" | "finance"; data: Array<{ month?: string; name?: string; revenue: number; expenses: number }> }) {
  const root = useRef<HTMLDivElement>(null), [visible, setVisible] = useState(false);
  const { isRTL } = useAdminLocale();
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "100px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="h-full w-full flex flex-col">
    <div className="flex-1 min-h-0">
    {visible ? (kind === "dashboard" ? <DashboardChart data={data} /> : <FinanceChart data={data} />) : <p role="status" className="text-xs">{isRTL ? "يتم تحميل الرسم عند عرضه" : "Chart loads when visible"}</p>}
    </div>
    <details className="text-xs"><summary>{isRTL ? "عرض بيانات الرسم" : "View chart data"}</summary><table><thead><tr><th>{isRTL ? "الشهر" : "Month"}</th><th>{isRTL ? "الإيراد (BHD)" : "Revenue (BHD)"}</th><th>{isRTL ? "المصروف (BHD)" : "Expenses (BHD)"}</th></tr></thead><tbody>{data.map((row, i) => <tr key={i}><td>{row.month || row.name}</td><td>{row.revenue}</td><td>{row.expenses}</td></tr>)}</tbody></table></details>
  </div>;
}
