"use client";
import { errorMessage } from "../../lib/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { deleteAttachmentAction } from "../../app/actions/attachments";
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
    <section className="rounded-lg border border-slate-200 dark:border-white/10 p-5 space-y-4">
      <h2 className="font-semibold">{h.documents}</h2>
      {canEdit && (
        <label className="block">
          {h.upload}
          <input
            disabled={busy}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void run(() =>
                  uploadFileDirectly(file, {
                    entityType: "employee",
                    entityId: employeeId,
                  }),
                );
              e.target.value = "";
            }}
          />
        </label>
      )}
      {!attachments.length && <p className="text-slate-500">{h.empty}</p>}
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
