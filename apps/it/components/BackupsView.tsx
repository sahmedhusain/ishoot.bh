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
} from "lucide-react";
import { Button, Card } from "@platform/ui";
import type { BackupRecord } from "@platform/api-client";
import {
  triggerBackupAction,
  verifyBackupAction,
} from "../app/(desk)/backups/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={b.title} description={b.description} />
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
              className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
            >
              <option value="database">{b.kindDatabase}</option>
              <option value="bucket">{b.kindBucket}</option>
              <option value="full">{b.kindFull}</option>
            </select>
            <Button
              type="button"
              disabled={busy}
              onClick={handleCreate}
              className="flex items-center gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{b.triggerBackup}</span>
            </Button>
          </div>
        )}
      </div>

      <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
        <h2 className="text-base font-semibold">{b.historyTitle}</h2>

        {backups === null ? (
          <p role="alert" className="py-6 text-center text-xs text-ink-muted">
            {b.unavailable}
          </p>
        ) : !backups.length ? (
          <p className="text-xs text-ink-muted py-6 text-center">{b.noBackups}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="it-table text-left rtl:text-right">
              <thead>
                <tr className="border-b border-outline-variant text-xs text-ink-muted">
                  <th className="pb-2 font-medium">{b.fileName}</th>
                  <th className="pb-2 font-medium">{b.kind}</th>
                  <th className="pb-2 font-medium">{b.size}</th>
                  <th className="pb-2 font-medium">{b.status}</th>
                  <th className="pb-2 font-medium">{b.createdAt}</th>
                  <th className="pb-2 font-medium">{b.verifiedAt}</th>
                  {canExecute && <th className="pb-2 font-medium">{b.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {backups.map((rec) => {
                  const isVerified = rec.status === "verified";
                  return (
                    <tr key={rec.id}>
                      <td className="py-3 font-mono text-xs">{rec.fileName}</td>
                      <td className="py-3 text-xs capitalize">{rec.kind}</td>
                      <td className="py-3 font-mono text-xs">
                        {formatSize(rec.fileSize)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isVerified
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                          }`}
                        >
                          {isVerified ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Archive className="h-3 w-3" />
                          )}
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-ink-muted">
                        {date(rec.createdAt)}
                      </td>
                      <td className="py-3 text-xs text-ink-muted">
                        {rec.verifiedAt ? date(rec.verifiedAt) : "—"}
                      </td>
                      {canExecute && (
                        <td className="py-3">
                          {!isVerified && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleVerify(rec.id)}
                              className="text-xs flex items-center gap-1"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>{b.verify}</span>
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
