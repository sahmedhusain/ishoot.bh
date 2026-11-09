"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Loader2,
  Search,
  Filter,
  X,
} from "lucide-react";
import type { BackupRecord } from "@platform/api-client";
import {
  triggerBackupAction,
  verifyBackupAction,
} from "../app/(desk)/backups/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { CriticalActionModal } from "./CriticalActionModal";

export function BackupsView({
  backups,
  canExecute,
}: {
  backups: BackupRecord[] | null;
  canExecute: boolean;
}) {
  const { copy, date } = useCopy();
  const b = copy.backups;
  const router = useRouter();

  const [busy, setBusy] = React.useState(false);
  const [kind, setKind] = React.useState<"database" | "bucket" | "full">("database");
  const [showTriggerModal, setShowTriggerModal] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedKindFilter, setSelectedKindFilter] = React.useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState("");

  const handleCreate = async () => {
    if (!canExecute) return;
    setBusy(true);
    try {
      await triggerBackupAction(kind);
      toast.success(b.created);
      router.refresh();
    } catch {
      toast.error(b.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (id: string) => {
    if (!canExecute) return;
    setBusy(true);
    try {
      await verifyBackupAction(id);
      toast.success(b.verified);
      router.refresh();
    } catch {
      toast.error(b.failed);
    } finally {
      setBusy(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredBackups = React.useMemo(() => {
    if (!backups) return null;
    return backups.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.fileName.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedKindFilter && item.kind !== selectedKindFilter) {
        return false;
      }
      if (selectedStatusFilter && item.status !== selectedStatusFilter) {
        return false;
      }
      return true;
    });
  }, [backups, searchQuery, selectedKindFilter, selectedStatusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={b.title} description={b.description} />
        <div className="flex items-center gap-2">
          {canExecute && (
            <div className="flex items-center gap-2">
              <select
                value={kind}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (value === "database" || value === "bucket" || value === "full") {
                    setKind(value);
                  }
                }}
                className="it-field-sunken text-xs font-mono font-bold py-1"
              >
                <option value="database">{b.kindDatabase}</option>
                <option value="bucket">{b.kindBucket}</option>
                <option value="full">{b.kindFull}</option>
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowTriggerModal(true)}
                className="it-btn-3d py-1 px-3 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>{b.triggerBackup}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="it-card p-0 overflow-x-auto">
        <div className="p-2 border-b border-slate-300 dark:border-slate-700 bg-surface flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase font-mono text-ink">{b.historyTitle}</h2>
          <span className="text-[10px] font-mono text-ink-muted">
            TOTAL ARCHIVES: {filteredBackups ? filteredBackups.length : 0} / {backups?.length ?? 0}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-300 dark:border-slate-700 text-xs font-mono">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={b.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="it-field-sunken w-full pl-7 pr-7 py-1 text-xs font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Filter className="size-3.5 text-slate-400" />
            <select
              value={selectedKindFilter}
              onChange={(e) => setSelectedKindFilter(e.target.value)}
              className="it-field-sunken text-xs font-mono py-1"
            >
              <option value="">{b.filterKind}: {b.filterAll}</option>
              <option value="database">{b.kindDatabase}</option>
              <option value="bucket">{b.kindBucket}</option>
              <option value="full">{b.kindFull}</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="it-field-sunken text-xs font-mono py-1"
            >
              <option value="">{b.filterStatus}: {b.filterAll}</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {(searchQuery || selectedKindFilter || selectedStatusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedKindFilter("");
                setSelectedStatusFilter("");
              }}
              className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400"
            >
              Clear
            </button>
          )}
        </div>

        {backups === null ? (
          <p role="alert" className="py-6 text-center text-xs font-mono text-ink-muted">
            {b.unavailable}
          </p>
        ) : !filteredBackups || !filteredBackups.length ? (
          <p className="text-xs font-mono text-ink-muted py-6 text-center">{b.noBackups}</p>
        ) : (
          <table className="it-table w-full font-mono text-xs">
            <thead>
              <tr>
                <th className="text-start">{b.fileName}</th>
                <th className="text-start">{b.kind}</th>
                <th className="text-start">{b.size}</th>
                <th className="text-start">{b.status}</th>
                <th className="text-start">{b.createdAt}</th>
                <th className="text-start">{b.verifiedAt}</th>
                {canExecute && <th className="text-start">{b.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBackups.map((rec) => {
                const isVerified = rec.status === "verified";
                return (
                  <tr key={rec.id}>
                    <td className="font-mono text-xs">{rec.fileName}</td>
                    <td className="text-xs uppercase font-bold">{rec.kind}</td>
                    <td className="font-mono text-xs">
                      {formatSize(rec.fileSize)}
                    </td>
                    <td>
                      <span
                        className={`inline-block border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          isVerified
                            ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "border-sky-400 bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                        }`}
                      >
                        {isVerified ? "✔ VERIFIED" : rec.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-xs text-ink-muted">
                      {date(rec.createdAt)}
                    </td>
                    <td className="text-xs text-ink-muted">
                      {rec.verifiedAt ? date(rec.verifiedAt) : "—"}
                    </td>
                    {canExecute && (
                      <td>
                        {!isVerified && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleVerify(rec.id)}
                            className="it-btn-3d py-0.5 px-2 text-[10px] text-sky-800 dark:text-sky-300 font-bold flex items-center gap-1"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>{b.verify}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showTriggerModal && (
        <CriticalActionModal
          open={true}
          title={b.triggerModalTitle}
          description={b.triggerModalDesc}
          impactDetails={[
            `Target Kind: ${kind.toUpperCase()}`,
            b.triggerModalImpact,
          ]}
          requiredConfirmationText="BACKUP"
          dangerLevel="warning"
          busy={busy}
          onCancel={() => setShowTriggerModal(false)}
          onConfirm={async () => {
            setShowTriggerModal(false);
            await handleCreate();
          }}
        />
      )}
    </div>
  );
}
