"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@platform/ui";
import type { AnnouncementDetail } from "@platform/database";
import { AnnouncementForm, type AudienceOptions } from "./AnnouncementForm";
import { ApprovalDecisionPanel } from "../approvals/ApprovalDecisionPanel";
import { BilingualPdfActions } from "../shared/BilingualPdfActions";
import {
  archiveAnnouncementAction,
  submitAnnouncementAction,
  announcementReceiptAction,
} from "../../app/actions/communications";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
export function AnnouncementDetailView({
  item,
  options,
  createAny,
  approvalId,
  live,
}: {
  item: AnnouncementDetail;
  options: AudienceOptions;
  createAny: boolean;
  approvalId: string | null;
  live: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.communications;
  const labels: Record<string, string> = c;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, c.failed));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {locale === "ar" ? item.titleAr : item.titleEn}
        </h1>
        <p className="text-sm text-ink-muted">
          {item.reference} · {labels[item.status]} · {item.author}
        </p>
      </header>
      {item.canEdit ? (
        <AnnouncementForm
          initial={item}
          options={options}
          createAny={createAny}
        />
      ) : (
        <article className="rounded-3xl border border-ink/10 p-6 whitespace-pre-wrap leading-8">
          {locale === "ar" ? item.bodyAr : item.bodyEn}
        </article>
      )}
      <div className="flex flex-wrap gap-3">
        {item.canEdit && (
          <Button
            disabled={busy}
            onClick={() => run(() => submitAnnouncementAction(item.id))}
          >
            {c.submit}
          </Button>
        )}
        {item.canManage && (
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => run(() => archiveAnnouncementAction(item.id))}
          >
            {c.archive}
          </Button>
        )}
        {item.status === "published" && (
          <>
            {item.official && (
              <BilingualPdfActions
                pdfUrl={(lang, download) =>
                  `/api/announcements/${item.id}/pdf?locale=${lang}${download ? "&download=true" : ""}`
                }
              />
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(() =>
                  announcementReceiptAction(
                    item.id,
                    item.readAt ? "unread" : "read",
                  ),
                )
              }
            >
              {item.readAt ? c.unread : c.read}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(() =>
                  announcementReceiptAction(
                    item.id,
                    item.hiddenAt ? "unhide" : "hide",
                  ),
                )
              }
            >
              {item.hiddenAt ? c.unhide : c.hide}
            </Button>
            {item.requiresAcknowledgement && !item.acknowledgedAt && (
              <Button
                disabled={busy}
                onClick={() =>
                  run(() => announcementReceiptAction(item.id, "acknowledge"))
                }
              >
                {c.acknowledge}
              </Button>
            )}
          </>
        )}
      </div>
      {approvalId && (
        <ApprovalDecisionPanel
          approvalId={approvalId}
          requiresSignature={live}
        />
      )}
      {item.decisionNotes && <p>{item.decisionNotes}</p>}
      {!!item.readers.length && (
        <section className="rounded-2xl border p-5">
          <h2>{c.readers}</h2>
          <ul>
            {item.readers.map((r, i) => (
              <li key={i} className="py-2 border-b">
                {r.name} ·{" "}
                {r.acknowledgedAt
                  ? c.acknowledge
                  : r.readAt
                    ? c.read
                    : c.unread}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
