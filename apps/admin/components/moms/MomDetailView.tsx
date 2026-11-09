"use client";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CompanySettings,
  MinuteOfMeetingItem,
  MomAttendee,
  MomDiscussionPoint,
  MomActionItem,
} from "@platform/database";
import {
  DocumentLetterhead,
  DocumentFooter,
} from "../shared/DocumentLetterhead";
import { Button, Input, Modal, StatusBadge } from "@platform/ui";
import {
  Share2,
  Mail,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  ListTodo,
  Sparkles,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { momPdfUrl } from "../../lib/pdf-print";
import { BilingualPdfActions } from "../shared/BilingualPdfActions";
import { usePermissions } from "../../hooks/usePermissions";
import {
  approveAndSignMomAction,
  shareMomViaEmailAction,
} from "../../app/actions/mom";
import { getSignatureModeAction } from "../../app/actions/signatures";
import { SignatureCanvas } from "../shared/SignatureCanvas";
import { MomContent } from "./MomContent";
import { PageHeader } from "../layout/PageHeader";

interface MomDetailViewProps {
  mom: MinuteOfMeetingItem;
  company: CompanySettings;
  currentUser?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
    signature_url?: string | null;
  } | null;
}

export function MomDetailView({
  mom,
  company,
  currentUser,
}: MomDetailViewProps) {
  const router = useRouter();
  const { isArabic, t, isRTL } = useAdminLocale();
  const { can } = usePermissions();
  const [isApproving, setIsApproving] = React.useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);
  const emailFormId = React.useId();
  const emailPending = React.useRef(false);
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isAr = Boolean(mom.title_ar && (!mom.title || isRTL));

  const clientName = mom.client_name || t.momDetail.generalInternalMeeting;

  const formattedDate = new Date(mom.meeting_date).toLocaleDateString(
    isAr ? "ar-u-nu-latn" : "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const timeLocationString = [
    mom.start_time
      ? `${mom.start_time}${mom.end_time ? ` - ${mom.end_time}` : ""}`
      : "",
    mom.location ? mom.location : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const handleShareWhatsApp = () => {
    const textLines = [
      `*${t.momDetail.minutesOfMeeting} — ${mom.mom_number}*`,
      `*${t.momDetail.title}* ${mom.title}`,
      `*${t.momDetail.date}* ${formattedDate}`,
      timeLocationString
        ? `*${t.momDetail.timeLocation}* ${timeLocationString}`
        : "",
      mom.deal_title ? `*${t.momDetail.projectDeal}* ${mom.deal_title}` : "",
      "",
      `*${t.momDetail.keyDecisions}*`,
      ...(mom.decisions && mom.decisions.length > 0
        ? mom.decisions.map((d: string, i: number) => `${i + 1}. ${d}`)
        : [t.momDetail.noneRecorded]),
      "",
      `*${t.momDetail.actionItems}*`,
      ...(mom.action_items && mom.action_items.length > 0
        ? mom.action_items.map(
          (item: MomActionItem, i: number) =>
            `${i + 1}. [${(t.statusLabels as Record<string, string>)[item.status] ?? item.status}] ${item.task} — ${item.assignee || t.shared.unassigned}${item.dueDate ? ` (${formatMessage(t.copy.dueDate, { date: item.dueDate })})` : ""
            }`,
        )
        : [t.momDetail.none]),
      "",
      `_${formatMessage(t.copy.documentReference, { number: mom.mom_number })}_`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(textLines)}`;
    window.open(url, "_blank");
  };

  const [signLive, setSignLive] = React.useState(false);
  const [signPadOpen, setSignPadOpen] = React.useState(false);
  const [liveSignature, setLiveSignature] = React.useState<string | null>(null);

  const handleApproveAndSign = async () => {
    if (!currentUser) return;
    if (signLive && !liveSignature) return setSignPadOpen(true);
    setSignPadOpen(false);
    setIsApproving(true);
    setFeedbackMessage(null);
    try {
      const res = await approveAndSignMomAction(
        mom.id,
        liveSignature ?? undefined,
      );

      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: t.momDetail.momApprovedAndSignedSuccessfully,
        });
        router.refresh();
      } else {
        setFeedbackMessage({
          type: "error",
          text: t.momDetail.approveFailed,
        });
      }
    } catch {
      setFeedbackMessage({
        type: "error",
        text: t.momDetail.approveError,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || emailPending.current) return;
    emailPending.current = true;
    setIsSendingEmail(true);
    setFeedbackMessage(null);
    try {
      const res = await shareMomViaEmailAction(mom.id, recipientEmail);
      if (res.success && res.status !== "failed") {
        setFeedbackMessage({
          type: "success",
          text: formatMessage((res.status === "accepted"
            ? t.momDetail.emailAccepted
            : t.momDetail.emailQueued
          ), { email: recipientEmail }),
        });
        setIsEmailModalOpen(false);
      } else {
        setFeedbackMessage({
          type: "error",
          text: errorMessage(res.message, t, t.momDetail.emailFailed),
        });
      }
    } catch {
      setFeedbackMessage({
        type: "error",
        text: t.momDetail.emailFailed,
      });
    } finally {
      emailPending.current = false; setIsSendingEmail(false);
    }
  };

  const canSign =
    mom.status !== "approved" && !!currentUser && can("moms", "approve");
  React.useEffect(() => {
    if (canSign)
      getSignatureModeAction("mom")
        .then((r) => setSignLive(r.mode === "live"))
        .catch(() => undefined);
  }, [canSign]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      <PageHeader
        className="no-print"
        back={{ href: ROUTES.moms.list, label: t.momDetail.backToMinutesOfMeetings }}
        title={<bdi dir="ltr">{mom.mom_number}</bdi>}
        description={<bdi dir="auto">{mom.title}</bdi>}
        meta={
          <>
            <StatusBadge status={mom.status} />
            {mom.client_id && (
              <Link
                href={ROUTES.crm.customer(mom.client_id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1 text-xs font-medium text-primary hover:bg-surface-container-high transition-colors"
                title={t.momDetail.viewClient360}
              >
                <span>{clientName}</span>
                <span className="text-[10px] opacity-70" aria-hidden>↗</span>
              </Link>
            )}
            {mom.deal_title && (
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs text-on-surface-variant">
                {t.copy.dealLabel}{mom.deal_title}
              </span>
            )}
          </>
        }
        actions={
          <>
          <BilingualPdfActions
            pdfUrl={(language, download) =>
              momPdfUrl(mom.id, language, download)
            }
            canDownload={can("moms", "export")}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>{t.copy.whatsapp}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { setFeedbackMessage(null); setIsEmailModalOpen(true); }}
            className="gap-1.5"
          >
            <Mail className="w-4 h-4" />
            <span>{t.momDetail.shareEmail}</span>
          </Button>

          {canSign && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleApproveAndSign}
              disabled={isApproving}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isApproving ? t.momDetail.signing : t.momDetail.approveSign}
              </span>
            </Button>
          )}
          </>
        }
      />

      {signPadOpen && signLive ? (
        <section className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-2 no-print">
          <p className="text-xs text-ink-muted">{t.signing.signLiveHint}</p>
          <SignatureCanvas
            onChange={setLiveSignature}
            clearLabel={t.signaturePad.clear}
            hint={t.signaturePad.hint}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSignPadOpen(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!liveSignature || isApproving}
              onClick={handleApproveAndSign}
            >
              {t.momDetail.approveSign}
            </Button>
          </div>
        </section>
      ) : null}

      {feedbackMessage && (
        <div
          role="status"
          className={`p-4 rounded-2xl flex items-center gap-3 no-print ${feedbackMessage.type === "success"
            ? "bg-primary-container text-on-primary-container"
            : "bg-m3-error-container text-m3-on-error-container"
            }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      <MomContent mom={mom} />

      <div className="hidden print:block">
        <div
          dir={isAr ? "rtl" : "ltr"}
          data-print-target
          className={`w-full max-w-[850px] mx-auto bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden min-h-[1050px] print:min-h-0 print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible ${isAr ? "font-arabic" : "font-sans"
            }`}
        >
          <DocumentLetterhead
            documentType="mom"
            documentNumber={mom.mom_number}
            titleEn={t.momDetail.docTitle}
            titleAr={t.momDetail.docTitle}
            company={company}
            language={isAr ? "ar" : "en"}
            issueDateLabel={t.momDetail.meetingDate}
            issueDate={formattedDate}
            secondaryDateLabel={t.momDetail.timeVenue}
            secondaryDate={timeLocationString || undefined}
            statusLabel={t.momDetail.documentStatus}
            statusValue={mom.status.toUpperCase()}
            clientSectionTitle={t.momDetail.meetingContextEntity}
            client={{
              id: mom.client_id,
              name: mom.client_name || t.momDetail.internalSession,
            }}
          />

          <div className="p-8 sm:p-10 space-y-8 print:p-6 print:space-y-6">
            <div className="border-b-2 border-slate-900 pb-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                {t.momDetail.sessionSubjectFocus}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
                <bdi dir="auto">{mom.title}</bdi>
              </h2>
              {mom.title_ar && mom.title_ar !== mom.title && (
                <h3 className="text-base sm:text-lg font-semibold text-slate-600 font-arabic mt-1">
                  {mom.title_ar}
                </h3>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-accent" />
                  <span>{t.momDetail.date2}</span>
                </span>
                <p className="font-semibold text-slate-800">
                  {new Date(mom.meeting_date).toISOString().split("T")[0]}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-accent" />
                  <span>{t.momDetail.timing}</span>
                </span>
                <p className="font-semibold text-slate-800">
                  {mom.start_time || "—"}{" "}
                  {mom.end_time ? `to ${mom.end_time}` : ""}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-accent" />
                  <span>{t.momDetail.location}</span>
                </span>
                <p
                  className="font-semibold text-slate-800 truncate"
                  title={mom.location || ""}
                >
                  {mom.location || t.momDetail.locationMissing}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-accent" />
                  <span>{t.momDetail.recordedBy}</span>
                </span>
                <p className="font-semibold text-slate-800 truncate">
                  {mom.created_by_name || t.shared.system}
                </p>
              </div>
            </div>

            {mom.attendees && mom.attendees.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Users className="w-4 h-4 text-accent" />
                  <span>{t.momDetail.attendeesStakeholders}</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 text-start font-bold">#</th>
                        <th className="py-2.5 px-3 text-start font-bold">
                          <bdi dir="auto">{t.momDetail.name}</bdi>
                        </th>
                        <th className="py-2.5 px-3 text-start font-bold">
                          {t.momDetail.roleEntity}
                        </th>
                        <th className="py-2.5 px-3 text-center font-bold">
                          {t.momDetail.attendance}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mom.attendees.map((att: MomAttendee, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] w-10">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <bdi dir="auto">{att.name}</bdi>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {att.role || att.organization || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${att.attended
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                                }`}
                            >
                              {att.attended ? "attended" : "absent"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mom.agenda && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-accent" />
                    <span>{t.momDetail.meetingAgenda}</span>
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-line">
                    {mom.agenda}
                  </div>
                </div>
              )}

              {mom.notes && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                    <span>{t.momDetail.administrativeNotes}</span>
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-line">
                    {mom.notes}
                  </div>
                </div>
              )}
            </div>

            {mom.discussion_points && mom.discussion_points.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5">
                  {t.momDetail.keyDiscussionPointsMinutes}
                </h3>
                <div className="space-y-2.5">
                  {mom.discussion_points.map(
                    (point: MomDiscussionPoint, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-800 leading-relaxed"
                      >
                        <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                          <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-mono">
                            {i + 1}
                          </span>
                          <span>{point.topic}</span>
                          {point.speaker && (
                            <span className="text-slate-500 font-normal text-[11px]">
                              ({point.speaker})
                            </span>
                          )}
                        </div>
                        <p className="ps-7 text-slate-700 whitespace-pre-line">
                          {point.notes}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {mom.decisions && mom.decisions.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-500/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>{t.momDetail.agreedDecisionsCommitments}</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-900 font-medium">
                  {mom.decisions.map((dec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      <span>{dec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mom.action_items && mom.action_items.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <span>{t.momDetail.actionItemsAccountabilities}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {mom.action_items.length} {t.momDetail.items}
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-y border-slate-900 bg-slate-100 text-slate-900 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 text-start font-bold w-10">
                          #
                        </th>
                        <th className="py-2.5 px-3 text-start font-bold">
                          {t.momDetail.actionItem}
                        </th>
                        <th className="py-2.5 px-3 text-start font-bold w-36">
                          {t.momDetail.assignee}
                        </th>
                        <th className="py-2.5 px-3 text-start font-bold w-28">
                          {t.momDetail.dueDate}
                        </th>
                        <th className="py-2.5 px-3 text-center font-bold w-24">
                          {t.momDetail.status}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mom.action_items.map((act: MomActionItem, i: number) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50/50 print-avoid-break"
                        >
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px] align-top">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="py-3 px-3 align-top font-semibold text-slate-900">
                            {act.task}
                          </td>
                          <td className="py-3 px-3 align-top text-slate-700">
                            {act.assignee || "—"}
                          </td>
                          <td className="py-3 px-3 align-top text-slate-600 font-mono text-[11px]">
                            {act.dueDate || "—"}
                          </td>
                          <td className="py-3 px-3 align-top text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${act.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : act.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                                }`}
                            >
                              {(t.statusLabels as Record<string, string>)[
                                act.status
                              ] ?? act.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DocumentFooter
            company={company}
            language={isAr ? "ar" : "en"}
            thankYouMessage={formatMessage(t.momDetail.officialRecordOfProceedingsCommitments, { companyName: isArabic ? company.company_name_ar : company.company_name_en })}
            showSignature={true}
            stampUrl={company.stamp_url}
            signatureUrl={mom.signature_url || null}
            signerName={
              mom.approved_by_name ||
              mom.created_by_name ||
              t.momDetail.sessionLeadExecutiveOfficer
            }
            signatureTitle={t.momDetail.recorderApprover}
            signatureTitleAr={t.momDetail.recorderApprover}
          />
        </div>
      </div>

      <Modal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title={t.momDetail.shareMomViaEmail}
        busy={isSendingEmail} className="max-w-md no-print" footer={<div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" disabled={isSendingEmail} onClick={() => setIsEmailModalOpen(false)}>{t.momDetail.cancel}</Button>
          <Button type="submit" form={emailFormId} disabled={isSendingEmail}>{isSendingEmail ? t.momDetail.sending : t.momDetail.sendEmail}</Button>
        </div>}>
        <form id={emailFormId} onSubmit={handleSendEmail}>
          <fieldset disabled={isSendingEmail}>
            <div>
              <label htmlFor={`${emailFormId}-recipient`} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.momDetail.recipientEmail}
              </label>
              <Input id={`${emailFormId}-recipient`}
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={t.copy.clientEmailExample}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

          </fieldset>
          {feedbackMessage?.type === "error" && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{feedbackMessage.text}</p>}
        </form>
      </Modal>
    </div>
  );
}
