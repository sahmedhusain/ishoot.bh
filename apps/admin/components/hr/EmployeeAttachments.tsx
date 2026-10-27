"use client";
import { errorMessage } from "../../lib/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadForClaim } from "../../lib/upload-client";
import {
  createAttachmentAction,
  deleteAttachmentAction,
} from "../../app/actions/attachments";
import { LinkOrUploadField } from "../shared/LinkOrUploadField";
export function EmployeeAttachments({
  employeeId,
  attachments,
  canEdit,
  canDelete = false,
}: {
  employeeId: string;
  attachments: { id: string; fileName: string; fileUrl: string }[];
  canEdit: boolean;
  /** Deleting needs employees:delete, which the server enforces. */
  canDelete?: boolean;
}) {
  const { t } = useAdminLocale();
  const h = t.hrExtensions;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [name, setName] = useState("");
  const [formKey, setFormKey] = useState(0);
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      router.refresh();
      toast.success(h.saved);
    } catch (e) {
      toast.error(errorMessage(e, t, h.failed));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-lg border border-outline-variant dark:border-white/10 p-5 space-y-4" data-page-section>
      <h2 className="font-semibold">{h.documents}</h2>
      {canEdit && (
        <form
          key={formKey}
          className="space-y-3 rounded-lg bg-surface-raised p-3 dark:bg-white/[0.03]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!fileUrl || !name.trim()) return;
            void run(async () => {
              const result = await createAttachmentAction({
                fileName: name.trim(),
                fileUrl,
                entityType: "employee",
                entityId: employeeId,
              });
              if (!result.success) throw new Error(result.error);
              setFileUrl("");
              setName("");
              setFormKey((k) => k + 1);
            });
          }}
        >
          {/* Upload the file, or link to it (e.g. a permit on a government portal). */}
          <LinkOrUploadField
            label={h.upload}
            value={fileUrl}
            disabled={busy}
            onChange={(url, meta) => {
              setFileUrl(url);
              if (url && !name && meta?.fileName)
                setName(meta.fileName.replace(/\.[^.]+$/, ""));
            }}
            upload={(file) =>
              uploadForClaim(file, {
                entityType: "employee",
                entityId: employeeId,
              })
            }
          />
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-semibold">
              {t.linkOrUpload.documentName}
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded border border-outline-variant bg-transparent p-2 text-sm font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !fileUrl || !name.trim()}
              className="h-10 rounded-lg bg-accent px-4 text-xs font-semibold text-accent-foreground disabled:opacity-50"
            >
              {t.linkOrUpload.addDocument}
            </button>
          </div>
        </form>
      )}
      {!attachments.length && <p className="text-ink-muted">{h.empty}</p>}
      {attachments.map((file) => (
        <div key={file.id} className="flex justify-between gap-3">
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {file.fileName}
          </a>
          {canDelete && (
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = await deleteAttachmentAction(file.id);
                  if (!result.success) throw new Error(result.error);
                })
              }
            >
              {h.remove}
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
