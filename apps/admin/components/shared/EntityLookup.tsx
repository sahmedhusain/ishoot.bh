"use client";
import { useEffect, useState } from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export function EntityLookup({ domain, value, onChange, clientId }: { domain: string; clientId?:string; value: string; onChange: (id: string) => void }) {
  const { t } = useAdminLocale();
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
  return <div className="space-y-2"><input aria-label={t.entityLookup.searchRecords} placeholder={t.entityLookup.searchRecords} className="h-10 w-full rounded-xl border border-ink/15 bg-surface-sunken/60 px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} maxLength={200} />
    <select aria-label={t.entityLookup.selectRecord} className="h-10 w-full rounded-xl border border-ink/15 bg-surface-sunken/60 px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{t.entityLookup.selectRecord}</option>{value && !items.some((i) => i.id === value) ? <option value={value}>{value}</option> : null}{items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select>
    {!items.length && !error ? <p className="text-xs">{t.entityLookup.searchForTheRecordYou}</p> : null}
    {page > 1 ? <button type="button" onClick={() => setPage(page - 1)}>{t.entityLookup.previous}</button> : null}{more ? <button type="button" onClick={() => setPage(page + 1)}>{t.entityLookup.next}</button> : null}{error ? <p role="alert">{t.entityLookup.couldNotLoadRecords}</p> : null}
  </div>;
}
