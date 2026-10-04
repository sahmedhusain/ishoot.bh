"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export function EntityLookup({ domain, value, onChange, clientId }: { domain: string; clientId?:string; value: string; onChange: (id: string) => void }) {
  const { isRTL } = useAdminLocale();
  const [query, setQuery] = useState(""), [page, setPage] = useState(1), [items, setItems] = useState<{ id: string; label: string }[]>([]), [more, setMore] = useState(false), [error, setError] = useState(false);
  useEffect(() => {
    setItems([]);setError(false);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/lookups/${domain}?${new URLSearchParams({ q: query, page: String(page), ...(clientId?{clientId}:{}) })}`, { signal: controller.signal });
        if (!response.ok) throw Error("Lookup failed");
        const result = await response.json(); setItems(result.items); setMore(result.hasMore); setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [domain, query, page, clientId]);
  return <div className="space-y-2"><input aria-label={isRTL ? "بحث عن سجل" : "Search records"} placeholder={isRTL ? "بحث عن سجل" : "Search records"} className="rounded border p-2 w-full text-slate-900" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} maxLength={200} />
    <select aria-label={isRTL ? "اختر سجلًا" : "Select record"} className="rounded border p-2 w-full text-slate-900" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{isRTL ? "اختر سجلًا" : "Select record"}</option>{value && !items.some((i) => i.id === value) ? <option value={value}>{value}</option> : null}{items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select>
    {!items.length && !error ? <p className="text-xs">{isRTL ? "ابحث عن السجل المطلوب" : "Search for the record you need"}</p> : null}
    {page > 1 ? <button type="button" onClick={() => setPage(page - 1)}>{isRTL ? "السابق" : "Previous"}</button> : null}{more ? <button type="button" onClick={() => setPage(page + 1)}>{isRTL ? "التالي" : "Next"}</button> : null}{error ? <p role="alert">{isRTL ? "تعذر تحميل السجلات" : "Could not load records"}</p> : null}
  </div>;
}
