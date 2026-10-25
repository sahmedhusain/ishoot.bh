"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Lock, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { DealPipelineStage } from "@platform/database";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { BUILT_IN_DEAL_STAGES, DEAL_STAGE_DEFAULTS, isBuiltInDealStage, isSystemDealStage } from "@platform/database/constants/crm";
import { resetDealPipelineAction, saveDealPipelineAction } from "../../app/actions/pipeline";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { dealStageLabel } from "../../lib/deal-stages";
import { errorMessage } from "../../lib/error-text";
import { LanguageFields } from "../setup/LanguageFields";

interface Row {
  id: string;
  name_en: string;
  name_ar: string;
  probability: number;
  color: string;
  is_active: boolean;
  is_system: boolean;
  deal_count: number;
}

const toRow = (stage: DealPipelineStage): Row => ({
  id: stage.id,
  name_en: stage.name_en ?? "",
  name_ar: stage.name_ar ?? "",
  probability: stage.probability,
  color: stage.color ?? "",
  is_active: stage.is_active,
  is_system: stage.is_system,
  deal_count: stage.deal_count,
});

const CLOSED = new Set(["closed_won", "closed_lost"]);

/** Settings → Sales pipeline: the stages deals move through, their names, order, colour and win probability. */
export function PipelineSettingsView({ initialStages, languages, canEdit }: { initialStages: DealPipelineStage[]; languages: readonly ContentLanguage[]; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.pipelineSettings;
  const [rows, setRows] = React.useState<Row[]>(() => initialStages.map(toRow));
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [adding, setAdding] = React.useState("");

  const update = (id: string, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const move = (index: number, by: number) =>
    setRows((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length || CLOSED.has(next[target].id) || CLOSED.has(next[index].id)) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const remove = (id: string) => setRows((current) => current.filter((row) => row.id !== id));

  const missingBuiltIns = BUILT_IN_DEAL_STAGES.filter((id) => !rows.some((row) => row.id === id));
  const addStage = () => {
    const custom = adding === "__custom";
    const id = custom ? `stage_${Date.now().toString(36)}` : adding;
    if (!id) return;
    const defaults = isBuiltInDealStage(id) ? DEAL_STAGE_DEFAULTS[id] : { probability: 50, color: null };
    const row: Row = { id, name_en: "", name_ar: "", probability: defaults.probability, color: defaults.color ?? "", is_active: true, is_system: false, deal_count: 0 };
    setRows((current) => {
      // New working stages go before "invoiced", so the closing stages stay last.
      const at = current.findIndex((r) => r.id === "invoiced");
      const next = [...current];
      next.splice(at < 0 ? next.length - 2 : at, 0, row);
      return next;
    });
    setAdding("");
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveDealPipelineAction(rows.map(({ id, name_en, name_ar, probability, color, is_active }) => ({ id, name_en, name_ar, probability, color, is_active })));
      setRows(result.stages.map(toRow));
      setMessage({ tone: "ok", text: copy.saved });
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(copy.resetConfirm)) return;
    setSaving(true);
    setMessage(null);
    try {
      await resetDealPipelineAction();
      window.location.reload();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">{copy.subtitle}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={saving} className="gap-1.5 rounded-full">
              <RotateCcw className="w-3.5 h-3.5" />
              {copy.reset}
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving} className="gap-1.5 rounded-full">
              <Save className="w-3.5 h-3.5" />
              {saving ? copy.saving : copy.save}
            </Button>
          </div>
        )}
      </div>

      {message && (
        <p role="status" className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>
          {message.text}
        </p>
      )}

      <ol className="space-y-3">
        {rows.map((row, index) => {
          const label = dealStageLabel({ id: row.id, name_en: row.name_en || null, name_ar: row.name_ar || null }, t, locale);
          const locked = CLOSED.has(row.id);
          const removable = !isSystemDealStage(row.id) && row.deal_count === 0;
          return (
            <li key={row.id}>
              <Card className={`p-4 transition-all duration-200 ${row.is_active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex flex-col gap-1 pt-1">
                    <button type="button" aria-label={copy.moveUp} disabled={!canEdit || locked || index === 0} onClick={() => move(index, -1)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-ink/5 disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" aria-label={copy.moveDown} disabled={!canEdit || locked || CLOSED.has(rows[index + 1]?.id ?? "closed_won")} onClick={() => move(index, 1)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-ink/5 disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-[220px] space-y-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: row.color || "rgb(var(--brand-accent))" }} />
                      <span className="font-semibold text-sm text-ink">{label}</span>
                      {row.is_system && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-muted" title={copy.systemHint}>
                          <Lock className="w-3 h-3" />
                          {copy.system}
                        </span>
                      )}
                      <span className="text-[11px] text-ink-muted">{formatMessage(copy.dealCount, { count: row.deal_count })}</span>
                    </div>
                    {canEdit && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <LanguageFields
                          label={copy.name}
                          hint={isBuiltInDealStage(row.id) ? copy.nameHint : undefined}
                          en={row.name_en}
                          ar={row.name_ar}
                          maxLength={60}
                          languages={languages}
                          placeholder={(t.stages as Record<string, string>)[row.id]}
                          onChange={({ en, ar }) => update(row.id, { name_en: en, name_ar: ar })}
                        />
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-end gap-3">
                      <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span className="block">{copy.probability}</span>
                        <Input type="number" min={0} max={100} value={row.probability} disabled={locked} onChange={(e) => update(row.id, { probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} className="w-20 rounded-lg" />
                      </label>
                      <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span className="block">{copy.color}</span>
                        <input type="color" value={row.color || "#64748b"} onChange={(e) => update(row.id, { color: e.target.value })} className="h-9 w-12 rounded-lg border border-ink/15 bg-transparent" />
                      </label>
                      <label className="flex items-center gap-2 h-9 text-xs text-ink">
                        <input type="checkbox" checked={row.is_active} disabled={row.is_system || row.deal_count > 0} onChange={(e) => update(row.id, { is_active: e.target.checked })} />
                        {copy.active}
                      </label>
                      {removable && (
                        <button type="button" aria-label={formatMessage(copy.remove, { stage: label })} onClick={() => remove(row.id)} className="h-9 w-9 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      {canEdit && (
        <Card className="p-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 flex-1 min-w-[220px]">
            <span className="block">{copy.addLabel}</span>
            <select value={adding} onChange={(e) => setAdding(e.target.value)} className="w-full h-9 rounded-lg border border-ink/15 bg-surface px-3 text-sm">
              <option value="">{copy.addChoose}</option>
              {missingBuiltIns.map((id) => (
                <option key={id} value={id}>{(t.stages as Record<string, string>)[id] ?? id}</option>
              ))}
              <option value="__custom">{copy.addCustom}</option>
            </select>
          </label>
          <Button variant="outline" size="sm" onClick={addStage} disabled={!adding} className="gap-1.5 rounded-full">
            <Plus className="w-3.5 h-3.5" />
            {copy.add}
          </Button>
        </Card>
      )}
    </div>
  );
}
