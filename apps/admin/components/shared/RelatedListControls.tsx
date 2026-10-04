"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export function RelatedListControls({ pagination }: { pagination: Record<string, {page:number;total:number}> }) {
  const path = usePathname(), params = useSearchParams();
  const { isRTL } = useAdminLocale();
  function href(domain: string, page: number) { const query = new URLSearchParams(params.toString()); query.set(domain + "Page", String(page)); return `${path}?${query}`; }
  return <div className="space-y-2 rounded-xl border p-3 text-xs">
    <form action={path} method="get" className="flex gap-2"><input name="q" aria-label={isRTL ? "بحث في سجلات العميل" : "Search customer records"} defaultValue={params.get("q") || ""} maxLength={200} className="rounded border p-2 text-slate-900" /><button>{isRTL ? "بحث" : "Search"}</button></form>
    <div className="flex flex-wrap gap-4">{Object.entries(pagination).map(([domain, value]) => <nav key={domain} aria-label={domain + " pages"} className="flex gap-2"><span>{domain}: {value.total} · {value.page}/{Math.max(1,Math.ceil(value.total/50))}</span>{value.page>1?<Link href={href(domain,value.page-1)}>{isRTL ? "السابق" : "Previous"}</Link>:null}{value.page*50<value.total?<Link href={href(domain,value.page+1)}>{isRTL ? "التالي" : "Next"}</Link>:null}</nav>)}</div>
  </div>;
}
