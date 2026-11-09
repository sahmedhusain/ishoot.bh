"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import { ArrowLeft, ArrowRight, Lock, Paperclip, Send, UserPlus, X } from "lucide-react";
import type { TicketDetail } from "@platform/api-client";
import { ticketCategory, transitionsFrom } from "@platform/contracts";
import { commentAction, transitionAction, uploadAttachmentAction, type AttachmentInput, type Outcome } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { OverdueBadge, RemindedBadge, StatusBadge } from "./ticket-ui";

const MAX_TICKET_ATTACHMENTS = 10;
const MAX_TICKET_ATTACHMENT_SIZE_MB = 10;

interface TicketViewProps {
  detail: TicketDetail;
  canEdit: boolean;
  canAssign: boolean;
  isAssignee: boolean;
}

export function TicketView({
  detail,
  canEdit,
  canAssign,
  isAssignee,
}: TicketViewProps) {
  const { copy, locale, priority, transition, event, number, name, date } =
    useCopy();
  const t = copy.tickets;
  const router = useRouter();
  const { ticket, comments, events, attachments } = detail;
  const category = ticketCategory(ticket.category);
  const subcategory = category?.subcategories.find(
    (s) => s.key === ticket.subcategory,
  );
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [internal, setInternal] = React.useState(false);
  const [attachedFiles, setAttachedFiles] = React.useState<AttachmentInput[]>([]);
  const [uploadingFile, setUploadingFile] = React.useState(false);
  const [showAssignInput, setShowAssignInput] = React.useState(false);
  const [targetAssigneeId, setTargetAssigneeId] = React.useState("");
  const [targetAssigneeName, setTargetAssigneeName] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;

  const run = async (fn: () => Promise<Outcome>, done: string) => {
    setBusy(true);
    try {
      const { ok } = await fn();
      if (ok) toast.success(done);
      else toast.error(t.failed);
      router.refresh();
      return ok;
    } catch {
      toast.error(t.failed);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const actions = transitionsFrom(ticket.status).filter((name) =>
    name === "assign" ? canAssign && !isAssignee : canEdit,
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (attachedFiles.length >= MAX_TICKET_ATTACHMENTS) {
      toast.error(
        formatMessage(t.attachmentLimit, { count: MAX_TICKET_ATTACHMENTS }),
      );
      return;
    }
    if (file.size > MAX_TICKET_ATTACHMENT_SIZE_MB * 1024 * 1024) {
      toast.error(
        formatMessage(t.attachmentSizeLimit, {
          size: MAX_TICKET_ATTACHMENT_SIZE_MB,
        }),
      );
      return;
    }
    setUploadingFile(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await uploadAttachmentAction(form);
      if (res.ok && res.attachment) {
        setAttachedFiles((prev) => [...prev, res.attachment!]);
        toast.success(t.attachmentUploaded);
      } else {
        toast.error(t.attachmentUploadFailed);
      }
    } catch {
      toast.error(t.attachmentUploadFailed);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = message.trim();
    if (!body) return;
    const ok = await run(
      () =>
        commentAction(
          ticket.id,
          body,
          internal,
          attachedFiles.length > 0 ? attachedFiles : undefined,
        ),
      t.commented,
    );
    if (ok) {
      setMessage("");
      setAttachedFiles([]);
    }
  };

  const ticketAttachments = attachments.filter((a) => !a.commentId);

  const facts: [string, React.ReactNode][] = [
    [
      t.requester,
      <bdi key="r" dir="auto">
        {ticket.requesterName}
      </bdi>,
    ],
    [
      copy.login.email,
      <bdi key="e" dir="ltr">
        {ticket.requesterEmail}
      </bdi>,
    ],
    [t.category, category ? name(category) : ticket.category],
    [t.subcategory, subcategory ? name(subcategory) : ticket.subcategory],
    [t.priority, priority(ticket.priority)],
    [
      t.assignee,
      ticket.assigneeName ? (
        <bdi key="a" dir="auto">
          {ticket.assigneeName}
        </bdi>
      ) : (
        t.unassigned
      ),
    ],
    [t.created, date(ticket.createdAt)],
    [
      ticket.firstResponseAt ? t.respondedAt : t.respondBy,
      date(ticket.firstResponseAt ?? ticket.respondBy),
    ],
    [
      ticket.resolvedAt ? t.resolvedAt : t.resolveBy,
      date(ticket.resolvedAt ?? ticket.resolveBy),
    ],
  ];
  if (ticket.remindedAt) {
    facts.push([
      t.slaReminder,
      date(ticket.remindedAt),
    ]);
  }
  if (ticket.assetRef) {
    facts.push([
      t.assetRef,
      <bdi key="asset" dir="ltr">
        {ticket.assetRef}
      </bdi>,
    ]);
  }

  return (
    <div inert={busy} aria-busy={busy} className="space-y-4">

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-700 pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/tickets"
            aria-label={copy.nav.tickets}
            className="it-btn-3d py-1 px-2.5 flex items-center gap-1 font-mono text-xs font-bold"
          >
            <Back className="size-3.5" />
            <span>[F3 BACK]</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-800 dark:text-sky-300">
                #{number(ticket.number)}
              </span>
              <StatusBadge status={ticket.status} />
              {ticket.breached && <OverdueBadge />}
              {ticket.remindedAt && !ticket.breached && <RemindedBadge />}
            </div>
            <h1 className="text-sm font-bold text-ink mt-0.5">
              <bdi dir="auto">{ticket.title}</bdi>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAssign && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowAssignInput((prev) => !prev)}
              className="it-btn-3d py-1 px-3 font-mono text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1"
            >
              <UserPlus className="size-3" aria-hidden />
              <span>{ticket.assigneeId ? t.reassign : t.assignToStaff}</span>
            </button>
          )}
          {actions.map((actName) => (
            <button
              key={actName}
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  () => transitionAction(ticket.id, ticket.status, actName),
                  t.updated,
                )
              }
              className={`it-btn-3d py-1 px-3 font-mono text-xs font-bold ${
                actName === "cancel"
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-emerald-800 dark:text-emerald-300"
              }`}
            >
              {actName === "assign" ? t.assignToMe : transition(actName)}
            </button>
          ))}
        </div>
      </div>

      {!canEdit && <p className="text-xs font-mono text-ink-muted">{t.readOnly}</p>}

      {showAssignInput && canAssign && (
        <div className="it-card p-3 space-y-3 font-mono text-xs bg-slate-50 dark:bg-slate-900/60">
          <div className="border-b border-slate-300 dark:border-slate-700 pb-1 flex items-center gap-1.5 font-bold text-ink">
            <UserPlus className="size-3.5" aria-hidden />
            <span>{ticket.assigneeId ? t.reassignTicketToStaff : t.assignTicketToStaff}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">
                {t.staffIdOrEmail}
              </label>
              <input
                type="text"
                required
                value={targetAssigneeId}
                onChange={(e) => setTargetAssigneeId(e.target.value)}
                placeholder={t.assigneeIdPlaceholder}
                className="it-field-sunken w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">
                {t.staffName}
              </label>
              <input
                type="text"
                value={targetAssigneeName}
                onChange={(e) => setTargetAssigneeName(e.target.value)}
                placeholder={t.assigneeNamePlaceholder}
                className="it-field-sunken w-full text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowAssignInput(false)}
              className="it-btn-3d py-1 px-3 text-xs"
            >
              {copy.shared.common.cancel}
            </button>
            <button
              type="button"
              disabled={busy || !targetAssigneeId.trim()}
              onClick={() =>
                run(
                  () => transitionAction(ticket.id, ticket.status, "assign", targetAssigneeId, targetAssigneeName),
                  t.updated,
                ).then((ok) => {
                  if (ok) {
                    setShowAssignInput(false);
                    setTargetAssigneeId("");
                    setTargetAssigneeName("");
                  }
                })
              }
              className="it-btn-3d py-1 px-4 font-bold text-emerald-800 dark:text-emerald-300 text-xs"
            >
              {t.confirmAssignment}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2 space-y-4">
          <div className="it-card p-4 space-y-3 font-mono text-xs">
            <div className="border-b border-slate-300 dark:border-slate-700 pb-1">
              <span className="font-bold uppercase tracking-wider text-ink-muted text-[10px]">
                ORIGINAL REQUEST DESCRIPTION
              </span>
            </div>
            <p className="text-xs text-ink whitespace-pre-wrap font-sans leading-relaxed">
              <bdi dir="auto">{ticket.description}</bdi>
            </p>
            {ticketAttachments.length > 0 && (
              <div className="pt-2 border-t border-slate-300 dark:border-slate-700">
                <h2 className="text-[10px] font-bold uppercase text-ink-muted mb-1.5">
                  {t.attachments}
                </h2>
                <ul className="flex flex-wrap gap-1.5">
                  {ticketAttachments.map((a) => (
                    <li key={a.fileUrl}>
                      <a
                        href={`/tickets/${ticket.id}/attachment?${new URLSearchParams({ fileUrl: a.fileUrl })}`}
                        target="_blank"
                        rel="noreferrer"
                        className="it-btn-3d py-0.5 px-2 text-[10px] flex items-center gap-1 font-mono"
                      >
                        <Paperclip className="size-3" aria-hidden />
                        <bdi dir="auto">{a.fileName}</bdi>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="it-card p-4 space-y-3 font-mono text-xs">
            <div className="border-b border-slate-300 dark:border-slate-700 pb-1 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                {t.conversation}
              </h2>
              <span className="text-[10px] text-ink-muted">REPLIES: {comments.length}</span>
            </div>

            {comments.length === 0 ? (
              <p className="text-xs text-ink-muted py-3 text-center font-sans">{t.noComments}</p>
            ) : (
              <ul className="space-y-2">
                {comments.map((c) => {
                  const commentAtts = c.attachments?.length
                    ? c.attachments
                    : attachments.filter((a) => a.commentId === c.id);
                  return (
                    <li
                      key={c.id}
                      className={`p-2.5 border text-xs ${
                        c.internal
                          ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                          : c.authorRealm === "it"
                            ? "border-sky-400 bg-sky-50/50 dark:bg-sky-950/20"
                            : "border-slate-300 dark:border-slate-700 bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] text-ink-muted mb-1 border-b border-slate-200 dark:border-slate-800 pb-0.5">
                        <span className="flex items-center gap-1.5 font-bold uppercase text-ink">
                          {c.internal && (
                            <Lock className="size-3 text-amber-600" aria-label={t.internal} />
                          )}
                          <bdi dir="auto">[{c.authorRealm.toUpperCase()}] {c.authorName}</bdi>
                        </span>
                        <span>{date(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-ink font-sans text-xs">
                        <bdi dir="auto">{c.body}</bdi>
                      </p>
                      {commentAtts.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5 mt-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                          {commentAtts.map((a) => (
                            <li key={a.fileUrl}>
                              <a
                                href={`/tickets/${ticket.id}/attachment?${new URLSearchParams({ fileUrl: a.fileUrl })}`}
                                target="_blank"
                                rel="noreferrer"
                                className="it-btn-3d py-0.5 px-2 text-[10px] flex items-center gap-1"
                              >
                                <Paperclip className="size-3" aria-hidden />
                                <bdi dir="auto">{a.fileName}</bdi>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {canEdit && (
              <form onSubmit={send} className="space-y-2 pt-2 border-t border-slate-300 dark:border-slate-700">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf,text/plain,text/csv,.docx,.xlsx"
                />

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="font-bold uppercase text-[10px] text-ink-muted">TYPE:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="commentType"
                      checked={!internal}
                      onChange={() => setInternal(false)}
                      className="size-3.5"
                    />
                    <span>{t.reply}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-amber-800 dark:text-amber-300 font-bold">
                    <input
                      type="radio"
                      name="commentType"
                      checked={internal}
                      onChange={() => setInternal(true)}
                      className="size-3.5"
                    />
                    <span>{t.note}</span>
                  </label>
                </div>

                <textarea
                  required
                  maxLength={10000}
                  rows={3}
                  aria-label={internal ? t.note : t.reply}
                  placeholder={
                    internal ? t.notePlaceholder : t.replyPlaceholder
                  }
                  className="it-field-sunken w-full font-mono text-xs"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />

                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {attachedFiles.map((f, idx) => (
                      <span
                        key={f.fileUrl || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border border-slate-400 bg-surface text-ink"
                      >
                        <Paperclip className="size-3 text-ink-muted" aria-hidden />
                        <span className="max-w-[150px] truncate">{f.fileName}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="hover:text-rose-600 font-bold"
                          aria-label={t.removeAttachment}
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={
                      busy || uploadingFile || attachedFiles.length >= MAX_TICKET_ATTACHMENTS
                    }
                    onClick={() => fileInputRef.current?.click()}
                    className="it-btn-3d py-1 px-3 text-xs flex items-center gap-1.5"
                  >
                    <Paperclip className="size-3.5" aria-hidden />
                    <span>{uploadingFile ? t.uploading : t.attachFile}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={busy || uploadingFile || !message.trim()}
                    className="it-btn-3d py-1 px-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Send className="size-3.5" aria-hidden />
                    <span>{t.send}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="it-card p-3 font-mono text-xs space-y-2">
            <div className="border-b border-slate-300 dark:border-slate-700 pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                METADATA & PARAMETERS
              </h2>
            </div>
            <dl className="space-y-1.5 text-xs">
              {facts.map(([term, value]) => (
                <div key={term} className="border-b border-slate-200 dark:border-slate-800 pb-1 flex flex-col">
                  <dt className="text-[10px] font-bold uppercase text-ink-muted">{term}</dt>
                  <dd className="text-ink font-mono font-medium break-words mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="it-card p-3 font-mono text-xs space-y-2">
            <div className="border-b border-slate-300 dark:border-slate-700 pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                {t.history}
              </h2>
            </div>
            <ol className="space-y-1.5 max-h-64 overflow-y-auto">
              {events.map((e, i) => (
                <li key={`${e.createdAt}-${i}`} className="border-b border-slate-200 dark:border-slate-800 pb-1 text-[11px]">
                  <div className="text-ink font-bold uppercase">{event(e.kind)}</div>
                  <div className="text-ink-muted text-[10px]">{date(e.createdAt)}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
