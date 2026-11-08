"use client";
import type { StatisticItem } from "../../types/cms";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { formatMessage } from "@platform/locales";
import { Button, Card, Modal, Input, Select, ConfirmDialog } from "@platform/ui";
import { STATISTIC_PRESETS, type StatisticPreset } from "@platform/database/constants/statistics";
import { Plus, Edit, Trash2, Activity } from "lucide-react";
import { createStatisticAction, updateStatisticAction, deleteStatisticAction } from "../../app/actions/cms";
import { IconPicker } from "../shared/LazyIconPicker";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { LanguageFields } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

export function StatsManagementView({ initialStats, languages }: { initialStats: StatisticItem[]; languages: readonly ContentLanguage[] }) {
  const modalFormId = React.useId();

  const { t, isRTL } = useAdminLocale();
  const [stats, setStats] = React.useState(initialStats);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<StatisticItem | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [value, setValue] = React.useState("");
  const [labelEn, setLabelEn] = React.useState("");
  const [labelAr, setLabelAr] = React.useState("");
  const [subLabelEn, setSubLabelEn] = React.useState("");
  const [subLabelAr, setSubLabelAr] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState(0);
  const [source, setSource] = React.useState<"manual" | "preset">("manual");
  const [preset, setPreset] = React.useState<StatisticPreset>("projects_delivered");
  const [foundingYear, setFoundingYear] = React.useState("");
  const [roundTo, setRoundTo] = React.useState("");
  const [suffix, setSuffix] = React.useState("");

  const handleOpenNew = () => {
    setEditingItem(null);
    setValue(""); setLabelEn(""); setLabelAr("");
    setSubLabelEn(""); setSubLabelAr(""); setIcon(""); setSortOrder(0);
    setSource("manual"); setPreset("projects_delivered"); setFoundingYear(""); setRoundTo(""); setSuffix("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StatisticItem) => {
    setEditingItem(item);
    setValue(item.storedValue); setLabelEn(item.labelEn); setLabelAr(item.labelAr);
    setSubLabelEn(item.subLabelEn || ""); setSubLabelAr(item.subLabelAr || "");
    setIcon(item.icon || ""); setSortOrder(item.sortOrder);
    setSource(item.source === "preset" ? "preset" : "manual");
    setPreset((item.preset as StatisticPreset | null) ?? "projects_delivered");
    const anyItem = item as any;
    setFoundingYear(anyItem.presetParam?.toString() ?? "");
    setRoundTo(anyItem.roundTo?.toString() ?? ""); setSuffix(anyItem.suffix ?? "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const computed = source === "preset";
    const data = {
      value, labelEn, labelAr, subLabelEn, subLabelAr, icon, sortOrder, source,
      preset: computed ? preset : null,
      presetParam: computed && preset === "years_in_business" && foundingYear ? Number(foundingYear) : null,
      roundTo: computed && roundTo ? Number(roundTo) : null,
      suffix: computed && suffix.trim() ? suffix.trim() : null,
    };
    setError(null);
    try {
      if (editingItem) {
        await updateStatisticAction(editingItem.id, data);
      } else {
        await createStatisticAction(data);
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.statsView.saveFailed);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStatisticAction(deleteId);
      setStats(stats.filter((s) => s.id !== deleteId));
    } catch (error) {
      console.error(error);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={<Button onClick={handleOpenNew} className="bg-accent text-accent-foreground">
          <Plus className="w-4 h-4 me-2" /> {t.statsView.newStat}
        </Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.id} className="p-5 dark:bg-surface-raised flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-2xl font-bold text-accent">{stat.value}</div>
                {stat.source === "preset" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-semibold" title={t.statsView.computedNote}>
                    <Activity className="w-3 h-3" aria-hidden /> {t.statsView.computedBadge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm dark:text-ink">
                {isRTL && stat.labelAr ? stat.labelAr : stat.labelEn}
              </h3>
              <p className="text-xs text-ink-muted mt-1">
                {isRTL && stat.subLabelAr ? stat.subLabelAr : stat.subLabelEn}
              </p>
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(stat)} className="flex-1">
                <Edit className="w-3.5 h-3.5 me-1" /> {t.actions.edit}
              </Button>
              <Button aria-label={t.actions.delete} variant="danger" size="sm" onClick={() => setDeleteId(stat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal closeLabel={t.actions.close} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? t.statsView.editStat : t.statsView.newStat} footer={<div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">{t.statsView.cancel}</Button>
            <Button type="submit" className="bg-accent text-accent-foreground" form={modalFormId}>{t.statsView.saveStat}</Button>
          </div>}>
        <form onSubmit={handleSave} className="space-y-4" id={modalFormId}>
          <div role="radiogroup" aria-label={t.statsView.valueSource} className="inline-flex flex-wrap gap-1 p-1 rounded-full bg-surface-sunken border border-outline-variant">
            {(["manual", "preset"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={source === option}
                onClick={() => setSource(option)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${source === option ? "bg-accent text-accent-foreground shadow-sm" : "text-ink-muted hover:text-ink hover:bg-ink/5"}`}
              >
                {option === "manual" ? t.statsView.sourceManual : t.statsView.sourcePreset}
              </button>
            ))}
          </div>
          {source === "preset" && (
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-outline-variant p-4">
              <div className="col-span-2">
                <label htmlFor="stat-preset" className="text-xs font-bold block mb-1">{t.statsView.presetLabel}</label>
                <Select id="stat-preset" value={preset} onChange={e => setPreset(e.target.value as StatisticPreset)}>
                  {STATISTIC_PRESETS.map((p) => <option key={p} value={p}>{t.statsView[`preset_${p}`]}</option>)}
                </Select>
              </div>
              {preset === "years_in_business" && (
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="stat-founded" className="text-xs font-bold block mb-1">{t.statsView.foundingYear}</label>
                  <Input id="stat-founded" type="number" min={1900} max={new Date().getFullYear()} value={foundingYear} onChange={e => setFoundingYear(e.target.value)} required />
                </div>
              )}
              <div>
                <label htmlFor="stat-round" className="text-xs font-bold block mb-1">{t.statsView.roundTo}</label>
                <Input id="stat-round" type="number" min={1} value={roundTo} onChange={e => setRoundTo(e.target.value)} aria-describedby="stat-round-hint" />
                <p id="stat-round-hint" className="text-[11px] text-ink-muted mt-1">{formatMessage(t.statsView.roundToHint, { multiple: 10, exampleFrom: 157, exampleTo: 150 })}</p>
              </div>
              <div>
                <label htmlFor="stat-suffix" className="text-xs font-bold block mb-1">{t.statsView.suffix}</label>
                <Input id="stat-suffix" value={suffix} maxLength={10} placeholder={t.statsView.suffixHint} onChange={e => setSuffix(e.target.value)} />
              </div>
              <p className="col-span-2 text-[11px] text-ink-muted">{t.statsView.computedNote}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {source === "manual" && (
              <label className="col-span-2 sm:col-span-1">
                <span className="text-xs font-bold block mb-1">{t.statsView.valueLabel}</span>
                <Input value={value} maxLength={20} onChange={e => setValue(e.target.value)} required />
              </label>
            )}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-bold block mb-1">{t.statsView.lucideIcon}</label>
              <IconPicker value={icon} onChange={setIcon} placeholder={t.statsView.iconPlaceholder} />
            </div>
            <LanguageFields name="label" label={t.statsView.label} languages={languages} required maxLength={100} en={labelEn} ar={labelAr} onChange={(v) => { setLabelEn(v.en); setLabelAr(v.ar); }} />
            <LanguageFields name="subLabel" label={t.statsView.subLabel} languages={languages} maxLength={200} en={subLabelEn} ar={subLabelAr} onChange={(v) => { setSubLabelEn(v.en); setSubLabelAr(v.ar); }} />
          </div>
          <label><span className="text-xs font-bold block mb-1">{t.statsView.sortOrder}</span><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></label>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t.statsView.deleteStat} description={t.statsView.deleteConfirm} />
    </div>
  );
}
