"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Plus, Send, Users2 } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { BroadcastInput, BroadcastRow, SegmentInput, SegmentRow } from "@platform/database";
import { saveBroadcastAction, saveSegmentAction, sendBroadcastAction } from "../../app/actions/outreach";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";

/** Marketing → segments and e-mail: who to reach, and e-mail broadcasts to those who agreed. */
export function AudienceView({ segments, broadcasts, campaigns, currency, languages, canEdit }: { segments: SegmentRow[]; broadcasts: BroadcastRow[]; campaigns: { id: string; name: string }[]; currency: string; languages: readonly ContentLanguage[]; canEdit: boolean }) {
  const confirmAction = useConfirmation();
  const { t } = useAdminLocale();
  const copy = t.marketing.audience;
  const router = useRouter();
  const [segment, setSegment] = React.useState<SegmentInput | null>(null);
  const [broadcast, setBroadcast] = React.useState<BroadcastInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async <T,>(task: () => Promise<T>, done: string | ((result: T) => string) = copy.saved) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await task();
      setMessage({ tone: "ok", text: typeof done === "string" ? done : done(result) });
      router.refresh();
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const numberField = (key: "minOrders" | "minSpent" | "orderedWithinDays" | "notOrderedForDays", label: string) => (
    <Field label={label}>{(id) => <Input id={id} name={`segment-${key}`} type="number" min={0} value={segment![key]} onChange={(e) => setSegment({ ...segment!, [key]: e.target.value })} className="rounded-lg" />}</Field>
  );
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div data-page-header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
        <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      <Card className="p-5 space-y-4" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><Users2 className="w-4 h-4 text-accent" aria-hidden="true" />{copy.segments}</h2>
          {canEdit && !segment && <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setSegment({ name: "", minOrders: "", minSpent: "", orderedWithinDays: "", notOrderedForDays: "", city: "" })} data-testid="segment-new"><Plus className="w-3.5 h-3.5" />{copy.newSegment}</Button>}
        </div>
        {segment && (
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-outline-variant p-3" data-testid="segment-form">
            <Field label={copy.segmentName}>{(id) => <Input id={id} name="segmentName" maxLength={120} value={segment.name} onChange={(e) => setSegment({ ...segment, name: e.target.value })} className="rounded-lg" />}</Field>
            {numberField("minOrders", copy.minOrders)}
            {numberField("minSpent", formatMessage(copy.minSpent, { currency }))}
            {numberField("orderedWithinDays", copy.orderedWithinDays)}
            {numberField("notOrderedForDays", copy.notOrderedForDays)}
            <Field label={copy.city}>{(id) => <Input id={id} maxLength={80} value={segment.city} onChange={(e) => setSegment({ ...segment, city: e.target.value })} className="rounded-lg" />}</Field>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveSegmentAction(segment))) setSegment(null); }} data-testid="segment-save">{copy.saveSegment}</Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setSegment(null)}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {segments.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noSegments}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm" data-testid="segments-list">
            {segments.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-ink-muted">{formatMessage(copy.size, { size: s.size, reachable: s.reachable })}</span>
                {canEdit && <button type="button" className="ms-auto text-xs font-semibold text-primary dark:text-mint" onClick={() => setSegment({ id: s.id, name: s.name, minOrders: s.rules.minOrders?.toString() ?? "", minSpent: s.rules.minSpent?.toString() ?? "", orderedWithinDays: s.rules.orderedWithinDays?.toString() ?? "", notOrderedForDays: s.rules.notOrderedForDays?.toString() ?? "", city: s.rules.city ?? "" })}>{copy.edit}</button>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-4" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><Mail className="w-4 h-4 text-accent" aria-hidden="true" />{copy.broadcasts}</h2>
          {canEdit && !broadcast && segments.length > 0 && <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setBroadcast({ name: "", segmentId: segments[0].id, campaignId: "", subjectEn: "", subjectAr: "", bodyEn: "", bodyAr: "" })} data-testid="broadcast-new"><Plus className="w-3.5 h-3.5" />{copy.newBroadcast}</Button>}
        </div>
        {broadcast && (
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-outline-variant p-3" data-testid="broadcast-form">
            <Field label={copy.broadcastName}>{(id) => <Input id={id} name="broadcastName" maxLength={120} value={broadcast.name} onChange={(e) => setBroadcast({ ...broadcast, name: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.segment}>
              {(id) => (
                <Select id={id} name="broadcastSegment" value={broadcast.segmentId} onChange={(e) => setBroadcast({ ...broadcast, segmentId: e.target.value })} className="rounded-lg">
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label={copy.campaign}>
              {(id) => (
                <Select id={id} value={broadcast.campaignId ?? ""} onChange={(e) => setBroadcast({ ...broadcast, campaignId: e.target.value })} className="rounded-lg">
                  <option value="">{copy.noCampaign}</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
            <LanguageFields label={copy.subject} languages={languages} wide maxLength={200} en={broadcast.subjectEn} ar={broadcast.subjectAr} onChange={({ en, ar }) => setBroadcast({ ...broadcast, subjectEn: en, subjectAr: ar })} />
            <LanguageFields label={copy.body} languages={languages} multiline wide maxLength={20000} en={broadcast.bodyEn} ar={broadcast.bodyAr} onChange={({ en, ar }) => setBroadcast({ ...broadcast, bodyEn: en, bodyAr: ar })} />
            <div className="sm:col-span-3 flex gap-2">
              <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveBroadcastAction(broadcast))) setBroadcast(null); }} data-testid="broadcast-save">{copy.saveBroadcast}</Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setBroadcast(null)}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {broadcasts.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noBroadcasts}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm" data-testid="broadcasts-list">
            {broadcasts.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2" data-testid={`broadcast-${b.name}`}>
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-ink-muted">{b.segment}</span>
                <span className="text-xs text-ink-muted">{(copy.statuses as Record<string, string>)[b.status]}</span>
                {b.status !== "draft" && <span className="text-xs text-ink-muted">{formatMessage(copy.progress, { sent: b.sent, pending: b.pending, failed: b.failed })}</span>}
                {canEdit && b.status === "draft" && (
                  <span className="ms-auto flex gap-3">
                    <button type="button" className="text-xs font-semibold text-primary dark:text-mint" onClick={() => setBroadcast({ id: b.id, name: b.name, segmentId: b.segment_id, campaignId: b.campaign_id, subjectEn: b.subject_en, subjectAr: b.subject_ar, bodyEn: b.body_en, bodyAr: b.body_ar })}>{copy.edit}</button>
                    <button type="button" disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint" onClick={() => { confirmAction({ description: copy.sendConfirm, onConfirm: () => run(() => sendBroadcastAction(b.id), (r) => formatMessage(copy.queued, { count: r.count })) }); }} data-testid="broadcast-send"><Send className="w-3 h-3" />{copy.send}</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
