"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Mail, TrendingDown, TrendingUp } from "lucide-react";
import { Button, Card, Input, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { REPORT_FORMATS, REPORT_FREQUENCIES, changePercent, type ReportColumnKind } from "@platform/database/constants/reports";
import type { ReportResult, ReportScheduleRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { saveReportScheduleAction, stopReportScheduleAction } from "../../app/actions/reports";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Period presets relative to today. */
function presets(today: string) {
  const d = new Date(`${today}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return {
    thisMonth: { from: iso(new Date(Date.UTC(y, m, 1))), to: today },
    lastMonth: { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) },
    last30: { from: iso(new Date(d.getTime() - 29 * 86_400_000)), to: today },
    thisYear: { from: iso(new Date(Date.UTC(y, 0, 1))), to: today },
  };
}

/** One report: its period (with presets and the period before), a chart of its measure, the table, exports and e-mail schedules. */
export function ReportView({ result, locale: dataLocale, compare, schedules, currency, today }: { result: ReportResult; locale: "en" | "ar"; compare: boolean; schedules: ReportScheduleRecord[]; currency: string; today: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.reports;
  const router = useRouter();
  const { definition } = result;
  const title = (copy.catalog as Record<string, { title: string; description: string }>)[definition.key];
  const columnLabel = (key: string) => (copy.columns as Record<string, string>)[key] ?? key;
  const [period, setPeriod] = React.useState({ from: result.from, to: result.to });
  const query = (next: { from?: string; to?: string; compare?: boolean; format?: string }) => {
    const params = new URLSearchParams();
    if (definition.ranged) {
      params.set("from", next.from ?? result.from);
      params.set("to", next.to ?? result.to);
    }
    if (next.compare ?? compare) params.set("compare", "1");
    if (locale === "en") params.set("locale", "en");
    if (next.format) params.set("format", next.format);
    return params.toString();
  };
  const go = (next: { from?: string; to?: string; compare?: boolean }) => router.push(`${ROUTES.reports.report(definition.key)}?${query(next)}`);
  // Ask again in the reader's language when the server answered in the other one.
  React.useEffect(() => {
    if (locale !== dataLocale) router.replace(`${ROUTES.reports.report(definition.key)}?${query({})}`);
    // query depends on the values listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, dataLocale]);

  const show = (value: string | number | null | undefined, kind: ReportColumnKind) => {
    if (value === null || value === undefined || value === "") return "—";
    if (kind === "money" && typeof value === "number") return formatCurrencyValue(value, currency, locale === "ar");
    if (kind === "percent" && typeof value === "number") return `${value.toLocaleString("en", { maximumFractionDigits: 1 })}%`;
    if (kind === "date") return formatDate(String(value), locale);
    if (typeof value === "number") return value.toLocaleString("en", { maximumFractionDigits: 2 });
    return String(value);
  };
  const measure = definition.measure ? definition.columns.find((c) => c.key === definition.measure) : undefined;
  const top = measure ? result.rows.filter((r) => Number(r[measure.key]) > 0).slice(0, 10) : [];
  const max = Math.max(1, ...top.map((r) => Number(r[measure!.key]) || 0));
  const totalChange = measure && result.previous ? changePercent(Number(result.totals[measure.key]) || 0, Number(result.previous.totals[measure.key]) || 0) : null;
  const ranges = presets(today);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="space-y-2">
        <Link href={ROUTES.reports.list} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent"><ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />{copy.view.back}</Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title?.title}</h1>
        <p className="text-xs text-ink-muted max-w-2xl">{title?.description}</p>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-3" data-testid="report-controls">
        {definition.ranged ? (
          <>
            <Field label={copy.view.from}>{(id) => <Input id={id} name="reportFrom" type="date" value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} className="h-9 rounded-lg" />}</Field>
            <Field label={copy.view.to}>{(id) => <Input id={id} name="reportTo" type="date" value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} className="h-9 rounded-lg" />}</Field>
            <Button type="button" size="sm" variant="primary" className="rounded-full" onClick={() => go(period)} data-testid="report-run">{copy.view.run}</Button>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(ranges) as (keyof typeof ranges)[]).map((k) => (
                <button key={k} type="button" onClick={() => { setPeriod(ranges[k]); go(ranges[k]); }} className="rounded-full border border-ink/10 px-2.5 py-1 text-xs hover:border-accent">{copy.view.presets[k]}</button>
              ))}
            </div>
            {measure && (
              <label className="flex items-center gap-2 text-xs text-ink">
                <input type="checkbox" className="h-4 w-4 accent-accent" checked={compare} onChange={(e) => go({ ...period, compare: e.target.checked })} data-testid="report-compare" />
                {copy.view.compare}
              </label>
            )}
          </>
        ) : (
          <span className="text-sm text-ink-muted">{copy.view.snapshot}</span>
        )}
        <div className="ms-auto flex items-center gap-1.5">
          <Download className="w-4 h-4 text-ink-muted" aria-hidden="true" />
          {REPORT_FORMATS.map((f) => (
            <a key={f} href={`${ROUTES.reports.export(definition.key)}?${query({ format: f })}`} className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-semibold hover:border-accent" data-testid={`report-export-${f}`}>{copy.view.formats[f]}</a>
          ))}
        </div>
      </Card>

      {measure && result.previous && (
        <p className="text-xs text-ink-muted" data-testid="report-previous">
          {formatMessage(copy.view.previous, { from: formatDate(result.previous.from, locale), to: formatDate(result.previous.to, locale) })}: {show(result.previous.totals[measure.key] as number, measure.kind)}
          {totalChange !== null && (
            <span className={`ms-2 inline-flex items-center gap-1 font-semibold ${totalChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {totalChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> : <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />}
              {totalChange > 0 ? "+" : ""}{totalChange}%
            </span>
          )}
        </p>
      )}

      {top.length > 0 && measure && (
        <Card className="p-5 space-y-2" data-testid="report-chart">
          <h2 className="text-xs font-semibold text-ink-muted">{columnLabel(measure.key)}</h2>
          <ul className="space-y-1.5">
            {top.map((r) => (
              <li key={String(r.key)} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-xs">
                <span className="truncate text-ink" title={String(r.name)}>{String(r.name)}</span>
                <span className="h-3 rounded-full bg-ink/5 overflow-hidden"><span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((Number(r[measure.key]) || 0) / max) * 100}%` }} /></span>
                <span className="tabular-nums text-ink-muted">{show(r[measure.key], measure.kind)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-x-auto">
        {result.rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-ink-muted">{copy.view.empty}</p>
        ) : (
          <table className="w-full text-sm" data-testid="report-table">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-ink/10">
                {definition.columns.map((c) => <th key={c.key} className={`px-3 py-2 font-medium ${c.kind === "text" || c.kind === "date" ? "text-start" : "text-end"}`}>{columnLabel(c.key)}</th>)}
                {result.previous && measure && <th className="px-3 py-2 font-medium text-end">{copy.view.change}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {result.rows.map((r) => {
                const change = result.previous && measure ? changePercent(Number(r[measure.key]) || 0, result.previous.byKey[String(r.key)] ?? 0) : null;
                return (
                  <tr key={String(r.key)}>
                    {definition.columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.kind === "text" || c.kind === "date" ? "text-start" : "text-end tabular-nums"}`}>{show(r[c.key], c.kind)}</td>)}
                    {result.previous && measure && <td className={`px-3 py-2 text-end tabular-nums text-xs ${change === null ? "text-ink-muted" : change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{change === null ? "—" : `${change > 0 ? "+" : ""}${change}%`}</td>}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/10 font-semibold" data-testid="report-totals">
                {definition.columns.map((c, i) => <td key={c.key} className={`px-3 py-2 ${i === 0 ? "text-start" : "text-end tabular-nums"}`}>{i === 0 ? copy.view.total : c.key in result.totals ? show(result.totals[c.key], c.kind) : ""}</td>)}
                {result.previous && measure && <td />}
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      <Schedules reportKey={definition.key} schedules={schedules} />
    </div>
  );
}

/** E-mailing the report after each day, week or month. */
function Schedules({ reportKey, schedules }: { reportKey: string; schedules: ReportScheduleRecord[] }) {
  const { t, locale } = useAdminLocale();
  const copy = t.reports.schedules;
  const router = useRouter();
  const [draft, setDraft] = React.useState({ frequency: "weekly", format: "xlsx", recipients: "", locale, compare: false });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-5 space-y-3" data-testid="report-schedules">
      <h2 className="font-bold text-ink flex items-center gap-2"><Mail className="w-4 h-4 text-accent" aria-hidden="true" />{copy.title}</h2>
      <p className="text-xs text-ink-muted">{copy.hint}</p>
      {schedules.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.none}</p>
      ) : (
        <ul className="divide-y divide-ink/10 text-sm">
          {schedules.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="font-medium">{(copy.frequencies as Record<string, string>)[s.frequency]} · {(t.reports.view.formats as Record<string, string>)[s.format]}</span>
              <span className="text-xs text-ink-muted" dir="ltr">{s.recipients.join(", ")}</span>
              <span className="text-xs text-ink-muted">{formatMessage(copy.next, { time: formatDate(s.next_run_at, locale, "time") })}</span>
              {s.last_sent_at && <span className="text-xs text-ink-muted">{formatMessage(copy.lastSent, { time: formatDate(s.last_sent_at, locale, "time") })}</span>}
              <button type="button" disabled={busy} onClick={() => void run(() => stopReportScheduleAction(s.id, reportKey))} className="ms-auto text-xs font-semibold text-rose-600">{copy.remove}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid sm:grid-cols-4 gap-3 items-end">
        <Field label={copy.frequency}>
          {(id) => (
            <Select id={id} name="scheduleFrequency" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} className="rounded-lg">
              {REPORT_FREQUENCIES.map((f) => <option key={f} value={f}>{copy.frequencies[f]}</option>)}
            </Select>
          )}
        </Field>
        <Field label={copy.format}>
          {(id) => (
            <Select id={id} name="scheduleFormat" value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value })} className="rounded-lg">
              {REPORT_FORMATS.map((f) => <option key={f} value={f}>{t.reports.view.formats[f]}</option>)}
            </Select>
          )}
        </Field>
        <div className="sm:col-span-2"><Field label={copy.recipients}>{(id) => <Input id={id} name="scheduleRecipients" dir="ltr" maxLength={2000} value={draft.recipients} onChange={(e) => setDraft({ ...draft, recipients: e.target.value })} className="rounded-lg" />}</Field></div>
        <label className="flex items-center gap-2 text-xs text-ink sm:col-span-3"><input type="checkbox" className="h-4 w-4 accent-accent" checked={draft.compare} onChange={(e) => setDraft({ ...draft, compare: e.target.checked })} />{copy.compare}</label>
        <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy || !draft.recipients.trim()} onClick={() => void run(async () => { await saveReportScheduleAction({ reportKey, ...draft }); setDraft({ ...draft, recipients: "" }); })} data-testid="schedule-add">{copy.add}</Button>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600"}`}>{message.text}</p>}
    </Card>
  );
}
