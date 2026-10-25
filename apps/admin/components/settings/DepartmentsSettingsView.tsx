"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building, ChevronRight, Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { DepartmentNode } from "@platform/database";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { DEPARTMENT_CATALOGUE, DEPARTMENT_CODES, type DepartmentKey } from "@platform/database/constants/departments";
import { addCatalogueDepartmentsAction, deleteDepartmentAction, saveDepartmentAction } from "../../app/actions/departments";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";

interface Draft {
  id?: string;
  code: string;
  name_en: string;
  name_ar: string;
  parent_id: string;
  manager_id: string;
  deputy_id: string;
  cost_centre: string;
  is_active: boolean;
}

const EMPTY: Draft = { code: "", name_en: "", name_ar: "", parent_id: "", manager_id: "", deputy_id: "", cost_centre: "", is_active: true };

/** Settings → Departments: the company's departments as a tree, with head, deputy and cost centre. */
export function DepartmentsSettingsView({ departments, people, languages, canEdit }: { departments: DepartmentNode[]; people: { id: string; fullName: string }[]; languages: readonly ContentLanguage[]; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.departmentsSettings;
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [picked, setPicked] = React.useState<DepartmentKey[]>([]);
  const name = (d: Pick<DepartmentNode, "name_en" | "name_ar">) => (locale === "ar" ? d.name_ar || d.name_en : d.name_en || d.name_ar);
  const depth = (node: DepartmentNode) => {
    let level = 0;
    let parent = node.parent_id;
    while (parent && level < 8) {
      level++;
      parent = departments.find((d) => d.id === parent)?.parent_id ?? null;
    }
    return level;
  };
  const missing = DEPARTMENT_CATALOGUE.filter((key) => !departments.some((d) => d.catalogue_key === key || d.code === DEPARTMENT_CODES[key]));

  const run = async (task: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: done });
      setDraft(null);
      setPicked([]);
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    draft &&
    run(
      () => saveDepartmentAction({ ...draft, parent_id: draft.parent_id || null, manager_id: draft.manager_id || null, deputy_id: draft.deputy_id || null }),
      copy.saved,
    );

  const edit = (node: DepartmentNode) =>
    setDraft({ id: node.id, code: node.code, name_en: node.name_en, name_ar: node.name_ar, parent_id: node.parent_id ?? "", manager_id: node.manager_id ?? "", deputy_id: node.deputy_id ?? "", cost_centre: node.cost_centre ?? "", is_active: node.is_active });

  const select = (value: string, onChange: (value: string) => void, options: { id: string; label: string }[], none: string) =>
    function Picker(id: string) {
      return (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded-lg border border-ink/15 bg-surface px-3 text-sm">
          <option value="">{none}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      );
    };

  const form = draft && (
    <Card className="p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
      <h2 className="font-bold text-ink">{draft.id ? copy.editTitle : copy.newTitle}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <LanguageFields label={copy.name} en={draft.name_en} ar={draft.name_ar} languages={languages} maxLength={120} required onChange={({ en, ar }) => setDraft({ ...draft, name_en: en, name_ar: ar })} />
        <Field label={copy.code} hint={copy.codeHint}>
          {(id) => <Input id={id} dir="ltr" value={draft.code} maxLength={20} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} className="rounded-lg" />}
        </Field>
        <Field label={copy.parent}>
          {select(draft.parent_id, (value) => setDraft({ ...draft, parent_id: value }), departments.filter((d) => d.id !== draft.id).map((d) => ({ id: d.id, label: name(d) })), copy.noParent)}
        </Field>
        <Field label={copy.manager}>
          {select(draft.manager_id, (value) => setDraft({ ...draft, manager_id: value }), people.map((p) => ({ id: p.id, label: p.fullName })), copy.nobody)}
        </Field>
        <Field label={copy.deputy}>
          {select(draft.deputy_id, (value) => setDraft({ ...draft, deputy_id: value }), people.map((p) => ({ id: p.id, label: p.fullName })), copy.nobody)}
        </Field>
        <Field label={copy.costCentre}>
          {(id) => <Input id={id} dir="ltr" value={draft.cost_centre} maxLength={40} onChange={(e) => setDraft({ ...draft, cost_centre: e.target.value })} className="rounded-lg" />}
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
          {copy.active}
        </label>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={save}>{copy.save}</Button>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDraft(null)}>{copy.cancel}</Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" className="gap-1.5 rounded-full" onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="w-3.5 h-3.5" />
            {copy.add}
          </Button>
        )}
      </div>

      {message && (
        <p role="status" className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>
          {message.text}
        </p>
      )}

      {form}

      {departments.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">{copy.empty}</Card>
      ) : (
        <ul className="space-y-2" aria-label={copy.title}>
          {departments.map((node) => (
            <li key={node.id} style={{ paddingInlineStart: `${depth(node) * 1.5}rem` }}>
              <Card className={`p-4 flex flex-wrap items-center gap-4 transition-shadow hover:shadow-md ${node.is_active ? "" : "opacity-60"}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {depth(node) > 0 ? <ChevronRight className="w-3.5 h-3.5 text-ink-muted rtl:rotate-180" /> : <Building className="w-4 h-4 text-accent" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-ink truncate">{name(node)}</p>
                    <p className="text-[11px] text-ink-muted">
                      <span dir="ltr">{node.code}</span>
                      {node.cost_centre ? ` · ${formatMessage(copy.costCentreValue, { value: node.cost_centre })}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-ink-muted space-y-0.5 min-w-[160px]">
                  <p>{formatMessage(copy.managerValue, { name: node.manager_name ?? copy.nobody })}</p>
                  {node.deputy_name && <p>{formatMessage(copy.deputyValue, { name: node.deputy_name })}</p>}
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                  <Users className="w-3.5 h-3.5" />
                  {formatMessage(copy.people, { count: Math.max(node.user_count, node.employee_count) })}
                </span>
                {canEdit && (
                  <div className="flex gap-1">
                    <button type="button" aria-label={formatMessage(copy.editNamed, { name: name(node) })} onClick={() => edit(node)} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {node.user_count + node.employee_count === 0 && (
                      <button type="button" aria-label={formatMessage(copy.deleteNamed, { name: name(node) })} onClick={() => window.confirm(copy.deleteConfirm) && run(() => deleteDepartmentAction(node.id), copy.deleted)} className="h-8 w-8 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canEdit && missing.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="font-bold text-sm text-ink">{copy.catalogueTitle}</h2>
          </div>
          <p className="text-xs text-ink-muted">{copy.catalogueHint}</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((key) => {
              const on = picked.includes(key);
              return (
                <button key={key} type="button" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((k) => k !== key) : [...picked, key])} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? "border-accent bg-accent/10 text-ink" : "border-ink/15 text-ink-muted hover:border-ink/30"}`}>
                  {(t.departmentCatalogue as Record<string, string>)[key]}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled={busy || !picked.length} onClick={() => run(() => addCatalogueDepartmentsAction(picked), copy.saved)}>{copy.addPicked}</Button>
            <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => run(() => addCatalogueDepartmentsAction([]), copy.saved)}>{copy.addRecommended}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
