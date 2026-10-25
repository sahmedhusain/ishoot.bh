"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Plus, Timer } from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { CannedReplyInput, CannedReplyRecord, ServiceSettingsRecord } from "@platform/database";
import { saveCannedReplyAction, saveServiceSettingsAction } from "../../app/actions/service-desk";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";

/** Requests → service settings: resolution times by priority, and the saved replies. */
export function ServiceSettingsView({ settings, replies, languages, canEditTimes }: { settings: ServiceSettingsRecord; replies: CannedReplyRecord[]; languages: readonly ContentLanguage[]; canEditTimes: boolean }) {
  const { t } = useAdminLocale();
  const copy = t.serviceDesk.settings;
  const router = useRouter();
  const [times, setTimes] = React.useState({ urgent: String(settings.sla_urgent_hours), high: String(settings.sla_high_hours), normal: String(settings.sla_normal_hours) });
  const [draft, setDraft] = React.useState<CannedReplyInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-ink flex items-center gap-2"><Timer className="w-4 h-4 text-accent" aria-hidden="true" />{copy.sla}</h2>
        <fieldset disabled={!canEditTimes} className="grid grid-cols-3 gap-3">
          {(["urgent", "high", "normal"] as const).map((key) => (
            <Field key={key} label={copy[key]}>{(id) => <Input id={id} name={`sla-${key}`} type="number" min={1} max={key === "normal" ? 2160 : 720} value={times[key]} onChange={(e) => setTimes({ ...times, [key]: e.target.value })} className="rounded-lg" />}</Field>
          ))}
        </fieldset>
        <p className="text-xs text-ink-muted">{copy.slaHint}</p>
        {canEditTimes && <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={() => void run(() => saveServiceSettingsAction(times))} data-testid="sla-save">{copy.save}</Button>}
      </Card>
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-accent" aria-hidden="true" />{copy.replies}</h2>
          {!draft && (
            <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setDraft({ title: "", bodyEn: "", bodyAr: "", isActive: true })} data-testid="canned-new">
              <Plus className="w-3.5 h-3.5" />
              {copy.addReply}
            </Button>
          )}
        </div>
        {draft && (
          <div className="grid gap-3 rounded-xl border border-ink/10 p-3" data-testid="canned-editor">
            <Field label={copy.replyTitle}>{(id) => <Input id={id} name="cannedTitle" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="rounded-lg" />}</Field>
            <LanguageFields label={copy.replyBody} languages={languages} multiline wide maxLength={4000} en={draft.bodyEn} ar={draft.bodyAr} onChange={({ en, ar }) => setDraft({ ...draft, bodyEn: en, bodyAr: ar })} />
            <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-accent" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />{copy.active}</label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveCannedReplyAction(draft))) setDraft(null); }} data-testid="canned-save">{copy.saveReply}</Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {replies.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noReplies}</p>
        ) : (
          <ul className="divide-y divide-ink/10 text-sm" data-testid="canned-list">
            {replies.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 py-2 ${r.is_active ? "" : "opacity-60"}`}>
                <span className="font-medium">{r.title}</span>
                {!r.is_active && <span className="text-xs text-ink-muted">{copy.inactive}</span>}
                <button type="button" className="ms-auto text-xs font-semibold text-primary dark:text-mint" onClick={() => setDraft({ id: r.id, title: r.title, bodyEn: r.body_en, bodyAr: r.body_ar, isActive: r.is_active })}>{copy.edit}</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
