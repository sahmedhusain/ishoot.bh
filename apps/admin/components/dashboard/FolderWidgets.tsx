"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMessage } from "@platform/locales";
import { Button, DateDisplay, Input, Select, useDialog } from "@platform/ui";
import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  FileText,
  Folder,
  FolderKanban,
  FolderPlus,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type {
  CustomArchiveFolder,
  CustomFolderItemLink,
} from "@platform/database/constants/dashboard";
import {
  deleteCustomFolderAction,
  saveCustomFolderAction,
} from "../../app/actions/dashboard";
import { ROUTES } from "../../constants/routes";
import type { DashboardData } from "../../lib/dashboard-widgets";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const widgetCard = "admin-widget h-full";

const FOLDER_TONES: Record<
  CustomArchiveFolder["color"],
  { bg: string; border: string; icon: string; badge: string }
> = {
  teal: {
    bg: "bg-accent/[0.08] hover:bg-accent/[0.14]",
    border: "border-accent/25 hover:border-accent/50",
    icon: "text-accent",
    badge: "bg-accent/15 text-accent",
  },
  emerald: {
    bg: "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14]",
    border: "border-emerald-500/25 hover:border-emerald-500/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/[0.08] hover:bg-amber-500/[0.14]",
    border: "border-amber-500/25 hover:border-amber-500/50",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  sky: {
    bg: "bg-sky-500/[0.08] hover:bg-sky-500/[0.14]",
    border: "border-sky-500/25 hover:border-sky-500/50",
    icon: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  violet: {
    bg: "bg-violet-500/[0.08] hover:bg-violet-500/[0.14]",
    border: "border-violet-500/25 hover:border-violet-500/50",
    icon: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  rose: {
    bg: "bg-rose-500/[0.08] hover:bg-rose-500/[0.14]",
    border: "border-rose-500/25 hover:border-rose-500/50",
    icon: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
};

const ARCHIVE_GROUP_COLOR: Record<string, CustomArchiveFolder["color"]> = {
  legal: "amber",
  hr: "violet",
  finance: "emerald",
  clients: "sky",
  assets: "rose",
  company: "teal",
};

/**
 * 1. Archive Vault Folders Widget (`archive_folders`)
 */
export function ArchiveFoldersWidget({
  data,
  settings,
}: {
  data: DashboardData;
  settings?: Record<string, unknown>;
}) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;
  const archive = data.archiveFolders;

  if (!archive) return null;

  const groupTitle = (key: string) =>
    (t.companyArchive.groups as Record<string, string>)[key] ?? key;

  const totalAlerts = archive.expiring + archive.expired;
  const wTheme =
    typeof settings?.theme === "string" ? settings.theme : "default";
  const wSurface =
    typeof settings?.surface === "string" ? settings.surface : "tonal";

  return (
    <section
      data-widget-theme={wTheme}
      data-widget-surface={wSurface}
      className={`${widgetCard} p-5 flex flex-col justify-between gap-4`}
      data-page-section
    >
      <div className="admin-widget-header">
        <h2 className="text-ink">
          <span className="text-accent" aria-hidden="true">
            <FolderKanban className="w-3.5 h-3.5" />
          </span>
          {b.widgets.archive_folders}
        </h2>
        <div className="flex items-center gap-2">
          {totalAlerts > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              {formatMessage(b.archiveExpiringBadge, { n: String(totalAlerts) })}
            </span>
          ) : null}
          <Link
            href={ROUTES.archive}
            className="text-xs text-primary dark:text-mint hover:underline font-semibold inline-flex items-center gap-1"
          >
            {b.view}
            <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {archive.groups.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {archive.groups.map((grp) => {
            const colorKey = ARCHIVE_GROUP_COLOR[grp.group] ?? "teal";
            const tone = FOLDER_TONES[colorKey] ?? FOLDER_TONES.teal;
            return (
              <Link
                key={grp.group}
                href={`${ROUTES.archive}?group=${encodeURIComponent(grp.group)}`}
                className={`group rounded-2xl border p-3 transition-all flex flex-col justify-between gap-2 ${tone.bg} ${tone.border}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Folder className={`w-5 h-5 shrink-0 ${tone.icon}`} aria-hidden="true" />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${tone.badge}`}
                  >
                    {grp.count}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-ink truncate group-hover:text-accent transition-colors">
                    {groupTitle(grp.group)}
                  </div>
                  <div className="text-[10px] text-ink-muted truncate">
                    {formatMessage(b.archiveDocsCount, { n: String(grp.count) })}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-ink-muted py-4 text-center">{b.none}</p>
      )}

      {archive.recent.length > 0 ? (
        <div className="pt-2 border-t border-outline-variant/60 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {b.archiveRecentTitle}
          </div>
          <ul className="divide-y divide-outline-variant/50">
            {archive.recent.slice(0, 3).map((doc) => (
              <li
                key={doc.id}
                className="py-1.5 flex items-center justify-between gap-2 text-xs"
              >
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex items-center gap-1.5 text-ink hover:text-accent truncate font-medium"
                >
                  <FileText
                    className="w-3.5 h-3.5 text-ink-muted shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    <bdi dir="auto">{doc.file_name}</bdi>
                  </span>
                </a>
                <DateDisplay
                  date={doc.created_at}
                  locale={locale}
                  className="shrink-0 text-[10px] text-ink-muted"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * 2. Custom Workspace Folders Widget (`custom_folders`)
 */
export function CustomFoldersWidget({
  data,
  settings,
}: {
  data: DashboardData;
  settings?: Record<string, unknown>;
}) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;
  const router = useRouter();
  const wTheme =
    typeof settings?.theme === "string" ? settings.theme : "default";
  const wSurface =
    typeof settings?.surface === "string" ? settings.surface : "tonal";

  const [folders, setFolders] = React.useState<CustomArchiveFolder[]>(
    () => data.customFolders ?? [],
  );
  const [activeFolder, setActiveFolder] = React.useState<CustomArchiveFolder | null>(
    null,
  );
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Create form state
  const [nameEn, setNameEn] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [color, setColor] = React.useState<CustomArchiveFolder["color"]>("emerald");
  const [scope, setScope] = React.useState<
    "personal" | "department" | "role" | "company"
  >("personal");

  // Add item inside active folder
  const [itemTitle, setItemTitle] = React.useState("");
  const [itemUrl, setItemUrl] = React.useState("");

  React.useEffect(() => {
    setFolders(data.customFolders ?? []);
  }, [data.customFolders]);

  const scopeLabel = (s: CustomArchiveFolder["scope"]) => {
    switch (s) {
      case "department":
        return b.folderScopeDepartment;
      case "role":
        return b.folderScopeRole;
      case "company":
        return b.folderScopeCompany;
      default:
        return b.folderScopePersonal;
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() && !nameAr.trim()) return;
    setBusy(true);
    try {
      const res = await saveCustomFolderAction({
        nameEn: nameEn.trim() || nameAr.trim(),
        nameAr: nameAr.trim() || nameEn.trim(),
        color,
        scope,
        departmentId: data.userProfile?.departmentId ?? null,
        items: [],
      });
      if (res?.folders) {
        setFolders(res.folders);
      }
      setNameEn("");
      setNameAr("");
      setCreating(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder || !itemTitle.trim() || !itemUrl.trim()) return;
    setBusy(true);
    try {
      const newItem: CustomFolderItemLink = {
        id: `item_${Date.now().toString(36)}`,
        kind: itemUrl.startsWith("/uploads/") ? "document" : "link",
        title: itemTitle.trim(),
        url: itemUrl.trim(),
        addedAt: new Date().toISOString(),
      };
      const updatedItems = [...activeFolder.items, newItem];
      const res = await saveCustomFolderAction({
        id: activeFolder.id,
        nameEn: activeFolder.nameEn,
        nameAr: activeFolder.nameAr,
        color: activeFolder.color,
        scope: activeFolder.scope,
        departmentId: activeFolder.departmentId ?? null,
        items: updatedItems,
      });
      if (res?.folder) {
        setActiveFolder(res.folder);
        setFolders((prev) =>
          prev.map((f) => (f.id === res.folder.id ? res.folder : f)),
        );
      }
      setItemTitle("");
      setItemUrl("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!activeFolder) return;
    setBusy(true);
    try {
      const updatedItems = activeFolder.items.filter((i) => i.id !== itemId);
      const res = await saveCustomFolderAction({
        id: activeFolder.id,
        nameEn: activeFolder.nameEn,
        nameAr: activeFolder.nameAr,
        color: activeFolder.color,
        scope: activeFolder.scope,
        departmentId: activeFolder.departmentId ?? null,
        items: updatedItems,
      });
      if (res?.folder) {
        setActiveFolder(res.folder);
        setFolders((prev) =>
          prev.map((f) => (f.id === res.folder.id ? res.folder : f)),
        );
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    setBusy(true);
    try {
      await deleteCustomFolderAction(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (activeFolder?.id === folderId) setActiveFolder(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const colorKeys = Object.keys(FOLDER_TONES) as CustomArchiveFolder["color"][];
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const closeOverlay = React.useCallback(() => {
    setCreating(false);
    setActiveFolder(null);
  }, []);
  const dialog = useDialog(mounted && (creating || !!activeFolder), closeOverlay);

  return (
    <section
      data-widget-theme={wTheme}
      data-widget-surface={wSurface}
      className={`${widgetCard} p-5 flex flex-col justify-between gap-4`}
      data-page-section
    >
      <div className="admin-widget-header">
        <h2 className="text-ink">
          <span className="text-accent" aria-hidden="true">
            <Folder className="w-3.5 h-3.5" />
          </span>
          {b.widgets.custom_folders}
        </h2>
        <button
          type="button"
          onClick={() => {
            setCreating((v) => !v);
            setActiveFolder(null);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-accent/12 text-accent hover:bg-accent/20 px-2.5 py-1 text-xs font-semibold transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{b.newCustomFolder}</span>
        </button>
      </div>

      {mounted && typeof document !== "undefined" && creating
        ? createPortal(
            <div
              data-modal-container
              data-kind="form"
              className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4 sm:p-6"
              onClick={() => setCreating(false)}
            >
              <div
                {...dialog}
                data-modal-card
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-lg rounded-[var(--admin-dialog-radius)] bg-surface-container-high border border-outline-variant shadow-[var(--admin-popup-shadow)] overflow-hidden"
              >
                <header
                  role="presentation"
                  data-modal-header
                  className="flex items-center justify-between gap-3 px-6 py-4 border-b border-outline-variant/60"
                >
                  <h2 className="text-base font-extrabold text-ink">
                    {b.newCustomFolder}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="w-8 h-8 rounded-full bg-surface-container-highest text-ink-muted hover:text-ink flex items-center justify-center"
                    aria-label={t.actions.cancel}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </header>
                <form
                  onSubmit={handleCreateFolder}
                  data-dialog-body
                  className="p-6 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder={b.folderNameEn}
                      className="text-xs"
                      required={!nameAr.trim()}
                    />
                    <Input
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      placeholder={b.folderNameAr}
                      className="text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <Select
                      value={scope}
                      onChange={(e) =>
                        setScope(
                          e.target.value as
                            | "personal"
                            | "department"
                            | "role"
                            | "company",
                        )
                      }
                      className="text-xs"
                      aria-label={b.folderScope}
                    >
                      <option value="personal">{b.folderScopePersonal}</option>
                      <option value="department">{b.folderScopeDepartment}</option>
                      <option value="role">{b.folderScopeRole}</option>
                      <option value="company">{b.folderScopeCompany}</option>
                    </Select>
                    <div className="flex items-center gap-2 px-1">
                      {colorKeys.map((cKey) => (
                        <button
                          key={cKey}
                          type="button"
                          data-keep-round="true"
                          onClick={() => setColor(cKey)}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            color === cKey
                              ? "scale-125 ring-2 ring-accent"
                              : "opacity-70"
                          } ${FOLDER_TONES[cKey].badge}`}
                          aria-label={cKey}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreating(false)}
                    >
                      {t.actions.cancel}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={busy}
                    >
                      {b.folderCreate}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      {mounted && typeof document !== "undefined" && activeFolder
        ? createPortal(
            <div
              data-modal-container
              data-kind="form"
              className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4 sm:p-6"
              onClick={() => setActiveFolder(null)}
            >
              <div
                {...dialog}
                data-modal-card
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-xl rounded-[var(--admin-dialog-radius)] bg-surface-container-high border border-outline-variant shadow-[var(--admin-popup-shadow)] overflow-hidden"
              >
                <header
                  role="presentation"
                  data-modal-header
                  className="flex items-center justify-between gap-3 px-6 py-4 border-b border-outline-variant/60"
                >
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-ink truncate">
                      <bdi dir="auto">
                        {locale === "ar"
                          ? activeFolder.nameAr || activeFolder.nameEn
                          : activeFolder.nameEn || activeFolder.nameAr}
                      </bdi>
                    </h2>
                    <div className="text-xs text-ink-muted">
                      {scopeLabel(activeFolder.scope)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(activeFolder.id)}
                      disabled={busy}
                      className="w-8 h-8 rounded-full bg-surface-container-highest text-ink-muted hover:text-rose-500 flex items-center justify-center"
                      title={t.actions.delete}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFolder(null)}
                      className="w-8 h-8 rounded-full bg-surface-container-highest text-ink-muted hover:text-ink flex items-center justify-center"
                      aria-label={b.folderClose}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div data-dialog-body className="p-6 space-y-4">
                  {activeFolder.items.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto">
                      <ul className="divide-y divide-outline-variant/50">
                        {activeFolder.items.map((item) => (
                          <li
                            key={item.id}
                            className="py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <Link
                              href={item.url}
                              className="min-w-0 flex items-center gap-1.5 text-ink hover:text-accent truncate font-medium"
                            >
                              <ExternalLink
                                className="w-3.5 h-3.5 text-accent shrink-0"
                                aria-hidden="true"
                              />
                              <span className="truncate">
                                <bdi dir="auto">{item.title}</bdi>
                              </span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-ink-muted hover:text-rose-500 p-1"
                              aria-label={b.folderRemoveItem}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted py-4 text-center">
                      {b.folderItemsEmpty}
                    </p>
                  )}

                  <form
                    onSubmit={handleAddItem}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-outline-variant/50"
                  >
                    <input
                      type="text"
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                      placeholder={b.folderItemTitlePlaceholder}
                      className="sm:col-span-5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-ink"
                      required
                    />
                    <input
                      type="text"
                      dir="ltr"
                      value={itemUrl}
                      onChange={(e) => setItemUrl(e.target.value)}
                      placeholder={b.folderItemHrefPlaceholder}
                      className="sm:col-span-5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-ink text-start"
                      required
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="sm:col-span-2 rounded-lg bg-accent text-accent-ink px-3 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {folders.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {folders.map((folder) => {
            const tone = FOLDER_TONES[folder.color] ?? FOLDER_TONES.emerald;
            const isSelected = activeFolder?.id === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolder(isSelected ? null : folder)}
                className={`group rounded-2xl border p-3 text-start transition-all flex flex-col justify-between gap-2 ${tone.bg} ${tone.border} ${
                  isSelected ? "ring-2 ring-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <Folder
                    className={`w-5 h-5 shrink-0 ${tone.icon}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${tone.badge}`}
                  >
                    {folder.items.length}
                  </span>
                </div>
                <div className="w-full min-w-0">
                  <div className="text-xs font-bold text-ink truncate">
                    <bdi dir="auto">
                      {locale === "ar"
                        ? folder.nameAr || folder.nameEn
                        : folder.nameEn || folder.nameAr}
                    </bdi>
                  </div>
                  <div className="text-[10px] text-ink-muted flex items-center gap-1 truncate mt-0.5">
                    {folder.scope === "personal" ? (
                      <Lock className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                    ) : folder.scope === "company" ? (
                      <ShieldCheck
                        className="w-2.5 h-2.5 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Users className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{scopeLabel(folder.scope)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-outline-variant p-4 text-center space-y-2">
          <p className="text-xs text-ink-muted">{b.folderEmpty}</p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-ink px-3 py-1 text-xs font-semibold"
          >
            <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
            {b.newCustomFolder}
          </button>
        </div>
      )}
    </section>
  );
}
