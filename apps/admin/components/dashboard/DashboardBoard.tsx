"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMessage } from "@platform/locales";
import { Button, Select } from "@platform/ui";
import { ArrowLeft, ArrowRight, GripVertical, LayoutGrid, Maximize2, Plus, RotateCcw, Users, X } from "lucide-react";
import { dashboardWidget, nextDashboardSize, type DashboardDesk, type DashboardLayoutItem, type DashboardWidgetSize } from "@platform/database/constants/dashboard";
import { resetDashboardLayoutAction, saveDashboardLayoutAction } from "../../app/actions/dashboard";
import { ROUTES } from "../../constants/routes";
import type { DashboardData } from "../../lib/dashboard-widgets";
import { errorMessage } from "../../lib/error-text";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { DashboardWidget, DashboardWidgetPlaceholder } from "./DashboardWidgets";

/** Grid columns for each size: phones stack, tablets pair up, wide screens use the 12-column grid. */
const SIZE_CLASS: Record<DashboardWidgetSize, string> = {
  s: "col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3",
  m: "col-span-12 md:col-span-6 xl:col-span-4",
  l: "col-span-12 xl:col-span-6",
  xl: "col-span-12 xl:col-span-8",
  full: "col-span-12",
};

interface DashboardBoardProps {
  desk: DashboardDesk;
  layout: DashboardLayoutItem[];
  custom: boolean;
  /** Widgets the person may place, in catalogue order. */
  available: string[];
  data: DashboardData;
  /** Ids whose data the server loaded (the saved layout); others wait for Done. */
  loaded: string[];
  showDepartment: boolean;
}

export function DashboardBoard({ desk, layout, custom, available, data, loaded, showDepartment }: DashboardBoardProps) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [items, setItems] = React.useState(layout);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [over, setOver] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [adding, setAdding] = React.useState("");
  const loadedIds = React.useMemo(() => new Set(loaded), [loaded]);

  React.useEffect(() => {
    if (!editing) setItems(layout);
  }, [layout, editing]);

  const label = (id: string) => (b.widgets as Record<string, string>)[id] ?? id;
  const unused = available.filter((id) => !items.some((item) => item.id === id));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((current) => {
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const resize = (index: number) => setItems((current) => current.map((item, i) => (i === index ? { ...item, size: nextDashboardSize(item.id, item.size) } : item)));
  const remove = (index: number) => setItems((current) => current.filter((_, i) => i !== index));
  const add = (id: string) => {
    if (!id) return;
    setItems((current) => [...current, { id, size: dashboardWidget(id)?.defaultSize ?? "m" }]);
    setAdding("");
  };

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      await saveDashboardLayoutAction(items);
      setEditing(false);
      setMessage(b.saved);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!window.confirm(b.resetConfirm)) return;
    setBusy(true);
    setError("");
    try {
      await resetDashboardLayoutAction();
      setEditing(false);
      setMessage(b.resetDone);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t.workload.focus[desk]}</h1>
          <p className="text-sm text-ink-muted mt-1">{t.workload.focusSubtitle[desk]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showDepartment && !editing ? (
            <Link href={ROUTES.departmentDashboard()} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 h-8 px-3.5 text-xs font-medium hover:border-accent">
              <Users className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              {b.myDepartment}
            </Link>
          ) : null}
          {editing ? (
            <>
              {custom ? (
                <Button type="button" variant="outline" size="sm" className="rounded-full h-8 gap-1.5 text-xs" disabled={busy} onClick={reset}>
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  {b.reset}
                </Button>
              ) : null}
              <Button type="button" variant="primary" size="sm" className="rounded-full h-8 px-4 text-xs" disabled={busy} onClick={finish} data-testid="dashboard-done">
                {busy ? b.saving : b.done}
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" className="rounded-full h-8 gap-1.5 text-xs" onClick={() => { setMessage(""); setEditing(true); }} data-testid="dashboard-customize">
              <LayoutGrid className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              {b.customize}
            </Button>
          )}
        </div>
      </div>

      {message ? <p role="status" className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{message}</p> : null}
      {error ? <p role="alert" className="text-xs font-medium text-rose-600">{error}</p> : null}

      {editing ? (
        <div className="rounded-xl border border-dashed border-accent/50 bg-accent/5 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <p className="text-xs text-ink-muted">{b.editHint}</p>
          {unused.length ? (
            <div className="flex items-center gap-2">
              <Select aria-label={b.addWidget} value={adding} onChange={(e) => setAdding(e.target.value)} className="rounded-lg h-8 text-xs min-w-48" data-testid="dashboard-add-select">
                <option value="">{b.addWidget}</option>
                {unused.map((id) => (
                  <option key={id} value={id}>{label(id)}</option>
                ))}
              </Select>
              <Button type="button" variant="outline" size="sm" className="rounded-full h-8 gap-1 text-xs" disabled={!adding} onClick={() => add(adding)} data-testid="dashboard-add">
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                {b.addWidget}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">{b.nothingToAdd}</p>
          )}
        </div>
      ) : null}

      {items.length ? (
        <ul className="grid grid-cols-12 gap-4 stagger-children" data-testid="dashboard-grid">
          {items.map((item, index) => {
            const name = label(item.id);
            const ready = loadedIds.has(item.id);
            return (
              <li
                key={item.id}
                className={`${SIZE_CLASS[item.size]} relative ${editing ? "cursor-grab" : ""} ${dragging === index ? "opacity-40" : ""} ${over === index && dragging !== index ? "ring-2 ring-accent rounded-xl" : ""}`}
                draggable={editing}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                  setDragging(index);
                }}
                onDragOver={(e) => {
                  if (!editing || dragging === null) return;
                  e.preventDefault();
                  setOver(index);
                }}
                onDragLeave={() => setOver((current) => (current === index ? null : current))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging !== null) move(dragging, index);
                  setDragging(null);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                data-testid={`widget-${item.id}`}
              >
                {editing ? (
                  <div className="absolute -top-3 end-3 z-10 flex items-center gap-0.5 rounded-full border border-ink/15 bg-white dark:bg-surface-raised shadow-sm px-1 py-0.5">
                    <span className="p-1 text-ink-muted" aria-label={formatMessage(b.drag, { name })} title={formatMessage(b.drag, { name })}>
                      <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <button type="button" className="p-1 rounded-full hover:bg-ink/5 disabled:opacity-30" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={formatMessage(b.moveEarlier, { name })} title={formatMessage(b.moveEarlier, { name })}>
                      <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" aria-hidden="true" />
                    </button>
                    <button type="button" className="p-1 rounded-full hover:bg-ink/5 disabled:opacity-30" onClick={() => move(index, index + 1)} disabled={index === items.length - 1} aria-label={formatMessage(b.moveLater, { name })} title={formatMessage(b.moveLater, { name })}>
                      <ArrowLeft className="w-3.5 h-3.5 ltr:rotate-180" aria-hidden="true" />
                    </button>
                    <button type="button" className="p-1 rounded-full hover:bg-ink/5" onClick={() => resize(index)} aria-label={formatMessage(b.resize, { name, size: (b.sizes as Record<string, string>)[item.size] })} title={formatMessage(b.resize, { name, size: (b.sizes as Record<string, string>)[item.size] })}>
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" className="p-1 rounded-full hover:bg-rose-500/10 text-rose-500" onClick={() => remove(index)} aria-label={formatMessage(b.remove, { name })} title={formatMessage(b.remove, { name })} data-testid={`widget-remove-${item.id}`}>
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                <div className={editing ? "pointer-events-none select-none" : "h-full"}>
                  {ready ? <DashboardWidget id={item.id} data={data} /> : <DashboardWidgetPlaceholder id={item.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink-muted">{b.empty}</p>
      )}
    </div>
  );
}
