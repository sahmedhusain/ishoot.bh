"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, FileText, Home, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button, Card } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { CmsPageRecord } from "@platform/database/queries/cms-pages";
import { deleteCmsPageAction, duplicateCmsPageAction, updateCmsPagesListAction } from "../../app/actions/cms-pages";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { UnpublishedChangesNotice } from "./UnpublishedChangesNotice";
import type { WebsiteSnapshotSection } from "@platform/database";

type Row = Pick<CmsPageRecord, "id" | "slug" | "page_type" | "title_en" | "title_ar" | "is_visible" | "in_header" | "in_footer" | "blocks">;

/** Website → Pages: every page in menu order, shown or hidden, in the header and footer menus or not. */
export function PagesListView({ pages, canEdit, canCreate, canDelete, canPublish, publication }: { pages: Row[]; canEdit: boolean; canCreate: boolean; canDelete: boolean; canPublish: boolean; publication: { isPublished: boolean; changedSections: WebsiteSnapshotSection[] } }) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.cmsPages;
  const router = useRouter();
  const [rows, setRows] = React.useState(pages);
  React.useEffect(() => setRows(pages), [pages]);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const dirty = JSON.stringify(rows.map(({ id, is_visible, in_header, in_footer }) => [id, is_visible, in_header, in_footer])) !== JSON.stringify(pages.map(({ id, is_visible, in_header, in_footer }) => [id, is_visible, in_header, in_footer]));

  const run = async (task: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: done });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setBusy(false);
    }
  };
  const move = (index: number, by: number) =>
    setRows((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 1 || target >= next.length || index === 0) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const toggle = (id: string, key: "is_visible" | "in_header" | "in_footer") => setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: !row[key] } : row)));
  const address = (row: Row) => `/${locale}${row.slug ? `/${row.slug}` : ""}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <UnpublishedChangesNotice section="pages" status={publication} canPublish={canPublish} />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
          <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" disabled={!dirty || busy} onClick={() => run(() => updateCmsPagesListAction(rows.map(({ id, is_visible, in_header, in_footer }) => ({ id, is_visible, in_header, in_footer }))), copy.saved)}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {copy.saveOrder}
            </Button>
          )}
          {canCreate && (
            <Link href={ROUTES.cms.page("new")} className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5" />
              {copy.newPage}
            </Link>
          )}
        </div>
      </div>

      {message && (
        <p role="status" className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>
      )}

      <ol className="space-y-2">
        {rows.map((row, index) => {
          const Icon = row.page_type === "home" ? Home : FileText;
          const title = locale === "ar" ? row.title_ar : row.title_en;
          return (
            <li key={row.id}>
              <Card className={`p-4 flex flex-wrap items-center gap-4 transition-all duration-200 hover:shadow-md ${row.is_visible ? "" : "opacity-60"}`}>
                {canEdit && row.page_type !== "home" && (
                  <div className="flex flex-col">
                    <button type="button" aria-label={copy.moveUp} disabled={index <= 1} onClick={() => move(index, -1)} className="p-1 rounded text-ink-muted hover:bg-ink/5 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" aria-label={copy.moveDown} disabled={index === rows.length - 1} onClick={() => move(index, 1)} className="p-1 rounded text-ink-muted hover:bg-ink/5 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <Icon className="w-4 h-4 text-accent" />
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-sm text-ink">{title}</p>
                  <p className="text-[11px] text-ink-muted text-start"><bdi dir="ltr">{address(row)}</bdi> · {formatMessage(copy.blockCount, { count: row.blocks.length })}</p>
                </div>
                {row.page_type !== "home" && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    {(["is_visible", "in_header", "in_footer"] as const).map((key) => (
                      <label key={key} className="flex items-center gap-1.5">
                        <input type="checkbox" disabled={!canEdit} checked={row[key]} onChange={() => toggle(row.id, key)} />
                        {copy.flags[key]}
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <Link href={ROUTES.cms.page(row.id)} aria-label={formatMessage(copy.editNamed, { name: title })} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5"><Pencil className="w-3.5 h-3.5" /></Link>
                  {canCreate && <button type="button" aria-label={formatMessage(copy.duplicateNamed, { name: title })} disabled={busy} onClick={() => run(() => duplicateCmsPageAction(row.id), copy.duplicated)} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5"><Copy className="w-3.5 h-3.5" /></button>}
                  {canDelete && row.page_type === "custom" && (
                    <button type="button" aria-label={formatMessage(copy.deleteNamed, { name: title })} disabled={busy} onClick={() => confirmAction({ description: copy.deleteConfirm, onConfirm: () => run(() => deleteCmsPageAction(row.id), copy.deleted) })} className="h-8 w-8 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
