"use client";
import { DataTable } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Button,
  ConfirmDialog,
  Input,
  Select,
  formatDate,
} from "@platform/ui";
import {
  ARCHIVE_GROUPS,
  ARCHIVE_KINDS,
  type ArchiveGroup,
  type ArchiveKind,
} from "@platform/database/constants/archive";
import type { CustomArchiveFolder } from "@platform/database/constants/dashboard";
import type { ArchiveDocument, ArchiveFilters } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import {
  createAttachmentAction,
  deleteAttachmentAction,
} from "../../app/actions/attachments";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { DashboardData } from "../../lib/dashboard-widgets";
import { errorMessage } from "../../lib/error-text";
import { uploadForClaim } from "../../lib/upload-client";
import { CustomFoldersWidget } from "../dashboard/FolderWidgets";
import { BilingualPdfActions } from "../shared/BilingualPdfActions";
import { LinkOrUploadField } from "../shared/LinkOrUploadField";
import { PageHeader } from "../layout/PageHeader";

const SORTS = ["newest", "oldest", "name", "expiry", "largest"] as const;
const EXPIRY = ["all", "expired", "expiring", "valid", "none"] as const;
const PAGE_SIZE = 50;

type Counts = {
  byKind: Record<string, number>;
  byGroup: Record<ArchiveGroup, number>;
  expired: number;
  expiring: number;
};

export function CompanyArchiveView({
  items,
  total,
  page,
  filters,
  counts,
  kinds,
  canExport,
  canUpload,
  customFolders,
}: {
  items: ArchiveDocument[];
  total: number;
  page: number;
  pageSize: number;
  filters: ArchiveFilters;
  counts: Counts;
  kinds: ArchiveKind[];
  canExport: boolean;
  canUpload: boolean;
  customFolders?: CustomArchiveFolder[];
}) {
  const { t, locale } = useAdminLocale();
  const v = t.companyArchive;
  const router = useRouter();
  const isAr = locale === "ar";
  const [q, setQ] = React.useState(filters.q);
  const [uploading, setUploading] = React.useState(false);
  const [file, setFile] = React.useState("");
  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState<"general" | "company_setting">(
    "general",
  );
  const [busy, setBusy] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const groups = ARCHIVE_GROUPS.filter((g) =>
    kinds.some((k) => ARCHIVE_KINDS[k].group === g),
  );
  const kindOptions = kinds.filter(
    (k) => filters.group === "all" || ARCHIVE_KINDS[k].group === filters.group,
  );

  const params = (patch: Partial<ArchiveFilters>) => {
    const next = { ...filters, page: 1, ...patch };
    const out = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (
        key === "page"
          ? value === 1
          : !value || value === "all" || (key === "sort" && value === "newest")
      )
        continue;
      out.set(key, String(value));
    }
    return out;
  };
  const href = (patch: Partial<ArchiveFilters>) => {
    const qs = params(patch).toString();
    return qs ? `${ROUTES.archive}?${qs}` : ROUTES.archive;
  };
  const go = (patch: Partial<ArchiveFilters>) => router.push(href(patch));
  const exportParams = params({});
  exportParams.delete("page");
  exportParams.delete("sort");
  const exportHref = `/api/exports/archive${exportParams.toString() ? `?${exportParams}` : ""}`;
  const filtered =
    filters.q ||
    filters.group !== "all" ||
    filters.kind !== "all" ||
    filters.expiry !== "all" ||
    filters.from ||
    filters.to ||
    filters.sort !== "newest";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const title = (d: ArchiveDocument) => {
    if (d.source === "salary_document")
      return (
        t.hrExtensions[d.file_name as "payslip" | "salary_certificate"] ??
        d.file_name
      );
    if (d.source === "asset_handover") return v.handoverForm;
    if (d.source === "vat_certificate") return v.vatCertificate;
    if (d.source === "tax_certificate")
      return formatMessage(v.taxCertificate, { name: (isAr ? d.owner_ar : d.owner_en) ?? d.file_name });
    if (d.source === "employee_credential") {
      const [kind, number] = d.file_name.split(" · ");
      return [
        t.employeeResidency.kinds[
        kind as keyof typeof t.employeeResidency.kinds
        ] ?? kind,
        number,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (d.source === "leave_evidence") return v.leaveEvidence;
    return d.file_name;
  };
  const owner = (d: ArchiveDocument) => {
    if (d.kind === "general" || d.kind === "company_asset")
      return v.companyWide;
    if (
      d.kind === "vat_certificate" ||
      d.kind === "tax_certificate" ||
      d.kind === "company_setting"
    )
      return v.taxSettings;
    return (isAr ? d.owner_ar : d.owner_en) || "—";
  };
  const expiry = (d: ArchiveDocument) => {
    if (!d.expires_on) return null;
    const days = Math.floor(
      (Date.parse(d.expires_on) - Date.now()) / 86_400_000,
    );
    const tone =
      days < 0
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : days <= 60
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      >
        {formatDate(d.expires_on, locale)}
      </span>
    );
  };
  const size = (bytes?: number) =>
    !bytes
      ? "—"
      : bytes >= 1048576
        ? `${(bytes / 1048576).toFixed(1)} ${v.mb}`
        : `${Math.max(1, Math.round(bytes / 1024))} ${v.kb}`;
  const icon = (d: ArchiveDocument) => {
    const lower = `${d.mime_type ?? ""} ${d.file_url}`.toLowerCase();
    if (lower.includes("pdf"))
      return <FileText className="h-4 w-4 shrink-0 text-rose-500" />;
    if (/image|\.png|\.jpe?g|\.webp/.test(lower))
      return <ImageIcon className="h-4 w-4 shrink-0 text-amber-500" />;
    return <File className="h-4 w-4 shrink-0 text-accent" />;
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !name.trim()) return;
    setBusy(true);
    try {
      const result = await createAttachmentAction({
        fileName: name.trim(),
        fileUrl: file,
        entityType: target,
        entityId: target === "general" ? "general-vault" : "company-settings",
      });
      if (!result.success) throw new Error(result.error);
      toast.success(v.uploaded);
      setUploading(false);
      setFile("");
      setName("");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, v.failed));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      const result = await deleteAttachmentAction(
        deleteId.replace(/^attachment:/, ""),
      );
      if (result && "success" in result && result.success === false)
        throw new Error((result as { error?: string }).error ?? v.failed);
      toast.success(v.deleted);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, v.failed));
    } finally {
      setDeleteId(null);
    }
  };

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 h-9 rounded-full border px-4 text-xs font-semibold transition-colors ${active ? "border-accent bg-accent/10 text-ink" : "border-outline-variant text-ink-muted hover:text-ink"}`;
  const select =
    "h-10 rounded-full border border-outline-variant bg-surface-sunken/60 px-4 text-xs text-ink focus:outline-none focus:border-accent";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        actions={<div className="flex flex-wrap items-center gap-2">
          <BilingualPdfActions
            label={t.communications.letterhead}
            pdfUrl={(lang, download) =>
              `/api/letterhead?locale=${lang}${download ? "&download=true" : ""}`
            }
          />
          {canExport ? (
            <a
              href={exportHref}
              className="inline-flex items-center gap-1.5 h-9 rounded-full border border-outline-variant px-4 text-xs font-semibold text-ink hover:bg-ink/5"
            >
              <Download className="h-3.5 w-3.5" />
              {v.export}
            </a>
          ) : null}
          {canUpload ? (
            <Link
              href={ROUTES.company.newDocument}
              className="inline-flex items-center gap-1.5 h-9 rounded-full border border-outline-variant px-4 text-xs font-semibold text-ink hover:bg-ink/5"
            >
              <Plus className="h-3.5 w-3.5" />
              {v.addLegal}
            </Link>
          ) : null}
          {canUpload && !uploading ? (
            <Button
              size="sm"
              className="gap-1.5 rounded-full h-9"
              onClick={() => setUploading(true)}
            >
              <UploadCloud className="h-4 w-4" />
              {v.upload}
            </Button>
          ) : null}
        </div>}
      />

      {uploading ? (
        <form
          onSubmit={upload}
          className="rounded-3xl border border-accent/30 bg-accent/5 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{v.upload}</h2>
            <button
              type="button"
              aria-label={t.actions.cancel}
              onClick={() => setUploading(false)}
              className="rounded-lg p-1 text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-ink-muted">{v.uploadHint}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <LinkOrUploadField
                label={v.file}
                required
                value={file}
                onChange={(url, meta) => {
                  setFile(url);
                  if (url && !name && meta?.fileName)
                    setName(meta.fileName.replace(/\.[^.]+$/, ""));
                }}
                upload={(picked) =>
                  uploadForClaim(picked, {
                    entityType: target,
                    entityId:
                      target === "general"
                        ? "general-vault"
                        : "company-settings",
                  })
                }
              />
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">
                <bdi dir="auto">{v.name}</bdi>
              </span>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">
                {v.fileUnder}
              </span>
              <Select
                value={target}
                onChange={(e) =>
                  setTarget(e.target.value as "general" | "company_setting")
                }
              >
                <option value="general">{v.kinds.general}</option>
                <option value="company_setting">
                  {v.kinds.company_setting}
                </option>
              </Select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setUploading(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || !file || !name.trim()}
            >
              {busy ? v.uploading : v.upload}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          [
            v.stats.total,
            Object.values(counts.byGroup).reduce((s, n) => s + n, 0),
            href({ group: "all", expiry: "all" }),
            "text-ink",
          ],
          [
            formatMessage(v.stats.expiring, { days: 60 }),
            counts.expiring,
            href({ expiry: "expiring", sort: "expiry" }),
            "text-amber-600 dark:text-amber-300",
          ],
          [
            v.stats.expired,
            counts.expired,
            href({ expiry: "expired", sort: "expiry" }),
            "text-rose-600 dark:text-rose-300",
          ],
          [
            v.stats.hr,
            counts.byGroup.hr ?? 0,
            href({ group: "hr" }),
            "text-ink",
          ],
        ].map(([label, value, link, tone]) => (
          <Link
            key={String(label)}
            href={String(link)}
            className="rounded-2xl border border-outline-variant bg-surface-raised p-4 hover:border-accent/40"
          >
            <div className="text-[11px] text-ink-muted">{label}</div>
            <div className={`text-lg font-bold mt-0.5 ${tone}`}>{value}</div>
          </Link>
        ))}
      </div>

      {customFolders !== undefined ? (
        <CustomFoldersWidget data={{ customFolders } as unknown as DashboardData} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={href({ group: "all", kind: "all" })}
          className={chip(filters.group === "all")}
        >
          {v.groups.all}
        </Link>
        {groups.map((g) => (
          <Link
            key={g}
            href={href({ group: g, kind: "all" })}
            className={chip(filters.group === g)}
          >
            {v.groups[g]}
            <span className="text-[10px] text-ink-muted">
              {counts.byGroup[g] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim() });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={v.search}
            aria-label={v.search}
            className="h-10 w-full rounded-full border border-outline-variant bg-surface-sunken/60 ps-9 pe-4 text-xs text-ink focus:outline-none focus:border-accent"
          />
        </div>
        <Select
          aria-label={v.type}
          className={select}
          value={filters.kind}
          onChange={(e) => go({ kind: e.target.value })}
        >
          <option value="all">{v.allTypes}</option>
          {kindOptions.map((k) => (
            <option key={k} value={k}>
              {v.kinds[k]}
              {counts.byKind[k] ? ` (${counts.byKind[k]})` : ""}
            </option>
          ))}
        </Select>
        <Select
          aria-label={v.expiry}
          className={select}
          value={filters.expiry}
          onChange={(e) => go({ expiry: e.target.value })}
        >
          {EXPIRY.map((x) => (
            <option key={x} value={x}>
              {x === "expiring" ? formatMessage(v.expiryFilters[x], { days: 60 }) : v.expiryFilters[x]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          {v.from}
          <input
            type="date"
            value={filters.from}
            onChange={(e) => go({ from: e.target.value })}
            className={select}
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          {v.to}
          <input
            type="date"
            value={filters.to}
            onChange={(e) => go({ to: e.target.value })}
            className={select}
          />
        </label>
        <Select
          aria-label={v.sort}
          className={select}
          value={filters.sort}
          onChange={(e) => go({ sort: e.target.value })}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {v.sorts[s]}
            </option>
          ))}
        </Select>
        {filtered ? (
          <Link
            href={ROUTES.archive}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
          >
            <X className="h-3.5 w-3.5" />
            {v.clear}
          </Link>
        ) : null}
      </form>

      <div className="text-[11px] text-ink-muted">
        {formatMessage(v.showing, { n: String(total) })}
      </div>

      {items.length ? (
        <div className="overflow-x-auto rounded-3xl border border-outline-variant bg-surface-raised">
          <DataTable className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-start">{v.columns.document}</th>
                <th className="px-4 py-3 text-start">{v.columns.relatedTo}</th>
                <th className="px-4 py-3 text-start">{v.columns.type}</th>
                <th className="px-4 py-3 text-start">{v.columns.added}</th>
                <th className="px-4 py-3 text-start">{v.columns.expires}</th>
                <th className="px-4 py-3 text-end">{v.columns.size}</th>
                <th className="px-4 py-3 text-end">
                  <span className="sr-only">{v.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3">
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-semibold text-ink hover:underline"
                    >
                      {icon(d)}
                      <span className="min-w-0 break-words">{title(d)}</span>
                    </a>
                    {d.source === "asset_handover" ? (
                      <div className="ms-6 font-mono text-[11px] text-ink-muted text-start"><bdi dir="ltr">{d.file_name}</bdi></div>
                    ) : null}
                    {d.uploaded_by ? (
                      <div className="ms-6 text-[11px] text-ink-muted">
                        {formatMessage(v.by, { name: d.uploaded_by })}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {d.owner_link ? (
                      <Link
                        href={d.owner_link}
                        className="text-accent hover:underline"
                      >
                        {owner(d)}
                      </Link>
                    ) : (
                      <span className="text-ink">{owner(d)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink">
                    {v.kinds[d.kind]}
                    <div className="text-[10px] text-ink-muted">
                      {v.groups[d.group]}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink whitespace-nowrap">
                    {formatDate(d.created_at, locale)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {expiry(d) ?? <span className="text-ink-muted">—</span>}
                  </td>
                  <td
                    className="px-4 py-3 text-xs text-ink-muted text-end whitespace-nowrap"
                    dir="ltr"
                  >
                    {size(d.file_size)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={v.open}
                        title={v.open}
                        className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {d.deletable && canUpload ? (
                        <button
                          type="button"
                          aria-label={v.delete}
                          title={v.delete}
                          onClick={() => setDeleteId(d.id)}
                          className="rounded-lg p-1.5 text-ink-muted hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-outline-variant p-10 text-center text-sm text-ink-muted">
          {filtered ? v.noMatches : v.empty}
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>
            {formatMessage(v.page, { page: String(page), pages: String(pages) })}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={href({ ...filters, page: page - 1 })}
                className={chip(false)}
              >
                {v.previous}
              </Link>
            ) : null}
            {page < pages ? (
              <Link
                href={href({ ...filters, page: page + 1 })}
                className={chip(false)}
              >
                {v.next}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {counts.expired ? (
        <p className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4" />
          {formatMessage(v.expiredNotice, { n: String(counts.expired) })}
        </p>
      ) : null}

      <ConfirmDialog
        isOpen={!!deleteId}
        title={v.deleteTitle}
        description={v.deleteBody}
        confirmLabel={v.delete}
        cancelLabel={t.actions.cancel}
        onConfirm={remove}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
