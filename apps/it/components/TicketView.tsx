"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import { Button, Card } from "@platform/ui";
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
    if (
      await run(
        () => commentAction(ticket.id, message, internal, attachedFiles),
        t.sent,
      )
    ) {
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
    <div inert={busy} aria-busy={busy} className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href="/tickets"
          aria-label={copy.nav.tickets}
          className="grid size-10 place-items-center rounded-full hover:bg-surface-container"
        >
          <Back className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-muted">
              {number(ticket.number)}
            </span>
            <StatusBadge status={ticket.status} />
            {ticket.breached && <OverdueBadge />}
            {ticket.remindedAt && !ticket.breached && <RemindedBadge />}
          </div>
          <h1 className="text-2xl font-bold text-ink mt-1">
            <bdi dir="auto">{ticket.title}</bdi>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAssign && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setShowAssignInput((prev) => !prev)}
              className="gap-1.5"
            >
              <UserPlus className="size-3.5" aria-hidden />
              {ticket.assigneeId
                ? t.reassign
                : t.assignToStaff}
            </Button>
          )}
          {actions.map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant={name === "cancel" ? "outline" : "primary"}
              disabled={busy}
              onClick={() =>
                run(
                  () => transitionAction(ticket.id, ticket.status, name),
                  t.updated,
                )
              }
            >
              {name === "assign" ? t.assignToMe : transition(name)}
            </Button>
          ))}
        </div>
      </div>
      {!canEdit && <p className="text-xs text-ink-muted">{t.readOnly}</p>}

      {showAssignInput && canAssign && (
        <Card className="p-4 rounded-2xl bg-surface border border-outline-variant space-y-3">
          <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
            <UserPlus className="size-3.5" aria-hidden />
            {ticket.assigneeId
              ? t.reassignTicketToStaff
              : t.assignTicketToStaff}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">
                {t.staffIdOrEmail}
              </label>
              <input
                type="text"
                required
                value={targetAssigneeId}
                onChange={(e) => setTargetAssigneeId(e.target.value)}
                placeholder={t.assigneeIdPlaceholder}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">
                {t.staffName}
              </label>
              <input
                type="text"
                value={targetAssigneeName}
                onChange={(e) => setTargetAssigneeName(e.target.value)}
                placeholder={t.assigneeNamePlaceholder}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAssignInput(false)}
            >
              {copy.shared.common.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
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
            >
              {t.confirmAssignment}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-3xl bg-surface border border-outline-variant space-y-3">
            <p className="text-sm text-ink whitespace-pre-wrap">
              <bdi dir="auto">{ticket.description}</bdi>
            </p>
            {ticketAttachments.length > 0 && (
              <div className="pt-2">
                <h2 className="text-xs font-semibold text-ink-muted mb-2">
                  {t.attachments}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {ticketAttachments.map((a) => (
                    <li key={a.fileUrl}>
                      <a
                        href={`/tickets/${ticket.id}/attachment?${new URLSearchParams({ fileUrl: a.fileUrl })}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink hover:border-accent"
                      >
                        <Paperclip className="size-3.5" aria-hidden />
                        <bdi dir="auto">{a.fileName}</bdi>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-6 rounded-3xl bg-surface border border-outline-variant space-y-4">
            <h2 className="text-sm font-bold text-ink">{t.conversation}</h2>
            {comments.length === 0 ? (
              <p className="text-xs text-ink-muted">{t.noComments}</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => {
                  const commentAtts = c.attachments?.length
                    ? c.attachments
                    : attachments.filter((a) => a.commentId === c.id);
                  return (
                    <li
                      key={c.id}
                      className={`p-3 rounded-2xl text-sm ${c.internal ? "bg-amber-500/10 border border-amber-500/30" : c.authorRealm === "it" ? "bg-accent/5 border border-accent/20" : "bg-surface-sunken"}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted mb-1">
                        <span className="flex items-center gap-1.5 font-semibold text-ink">
                          {c.internal && (
                            <Lock className="size-3" aria-label={t.internal} />
                          )}
                          <bdi dir="auto">{c.authorName}</bdi>
                        </span>
                        <span>{date(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-ink">
                        <bdi dir="auto">{c.body}</bdi>
                      </p>
                      {commentAtts.length > 0 && (
                        <ul className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-ink/10">
                          {commentAtts.map((a) => (
                            <li key={a.fileUrl}>
                              <a
                                href={`/tickets/${ticket.id}/attachment?${new URLSearchParams({ fileUrl: a.fileUrl })}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-outline-variant bg-surface text-xs text-ink hover:border-accent"
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
              <form onSubmit={send} className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf,text/plain,text/csv,.docx,.xlsx"
                />
                <div
                  role="radiogroup"
                  className="inline-flex p-1 rounded-full bg-surface-sunken border border-outline-variant"
                >
                  {[false, true].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      role="radio"
                      aria-checked={internal === value}
                      onClick={() => setInternal(value)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold ${internal === value ? "bg-accent text-accent-foreground" : "text-ink-muted"}`}
                    >
                      {value ? t.note : t.reply}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  maxLength={10000}
                  rows={3}
                  aria-label={internal ? t.note : t.reply}
                  placeholder={
                    internal ? t.notePlaceholder : t.replyPlaceholder
                  }
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachedFiles.map((f, idx) => (
                      <span
                        key={f.fileUrl || idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-outline-variant bg-surface text-ink"
                      >
                        <Paperclip className="size-3 text-ink-muted" aria-hidden />
                        <span className="max-w-[150px] truncate">{f.fileName}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="p-0.5 rounded-full hover:bg-surface-container text-ink-muted hover:text-ink"
                          aria-label={t.removeAttachment}
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      busy || uploadingFile || attachedFiles.length >= MAX_TICKET_ATTACHMENTS
                    }
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    <Paperclip className="size-3.5" aria-hidden />
                    {uploadingFile
                      ? t.uploading
                      : t.attachFile}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={busy || uploadingFile || !message.trim()}
                    className="gap-2"
                  >
                    <Send className="size-4" aria-hidden />
                    {t.send}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-3xl bg-surface border border-outline-variant">
            <dl className="space-y-3 text-sm">
              {facts.map(([term, value]) => (
                <div key={term}>
                  <dt className="text-[11px] text-ink-muted">{term}</dt>
                  <dd className="text-ink font-medium break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-6 rounded-3xl bg-surface border border-outline-variant">
            <h2 className="text-sm font-bold text-ink mb-3">{t.history}</h2>
            <ol className="space-y-2">
              {events.map((e, i) => (
                <li key={`${e.createdAt}-${i}`} className="text-xs">
                  <div className="text-ink font-medium">{event(e.kind)}</div>
                  <div className="text-ink-muted">{date(e.createdAt)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
