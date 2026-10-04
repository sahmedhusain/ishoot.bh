"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CompanySettings,
  MinuteOfMeetingItem,
  MomAttendee,
  MomDiscussionPoint,
  MomActionItem,
} from "@ishoot/database";
import {
  DocumentLetterhead,
  DocumentFooter,
} from "../shared/DocumentLetterhead";
import { Button, StatusBadge } from "@ishoot/ui";
import {
  ArrowLeft,
  ArrowRight,
  Printer,
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
import { usePermissions } from "../../hooks/usePermissions";
import {
  approveAndSignMomAction,
  shareMomViaEmailAction,
} from "../../app/actions/mom";

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
  const { isRTL } = useAdminLocale();
  const { can } = usePermissions();
  const [isApproving, setIsApproving] = React.useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [emailNote, setEmailNote] = React.useState("");
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const isAr = Boolean(mom.title_ar && (!mom.title || isRTL));

  const clientName =
    mom.client_name || (isAr ? "غير محدد" : "General Internal Meeting");

  const formattedDate = new Date(mom.meeting_date).toLocaleDateString(
    isAr ? "ar-BH" : "en-US",
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

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const textLines = [
      `*${isAr ? "محضر اجتماع" : "Minutes of Meeting"} — ${mom.mom_number}*`,
      `*${isAr ? "الموضوع:" : "Title:"}* ${mom.title}`,
      `*${isAr ? "التاريخ:" : "Date:"}* ${formattedDate}`,
      timeLocationString
        ? `*${isAr ? "الوقت / المكان:" : "Time / Location:"}* ${timeLocationString}`
        : "",
      mom.deal_title
        ? `*${isAr ? "المشروع / الصفقة:" : "Project / Deal:"}* ${mom.deal_title}`
        : "",
      "",
      `*${isAr ? "أهم القرارات:" : "Key Decisions:"}*`,
      ...(mom.decisions && mom.decisions.length > 0
        ? mom.decisions.map((d: string, i: number) => `${i + 1}. ${d}`)
        : [isAr ? "- لا توجد قرارات مدونة" : "- None recorded"]),
      "",
      `*${isAr ? "مهام المتابعة:" : "Action Items:"}*`,
      ...(mom.action_items && mom.action_items.length > 0
        ? mom.action_items.map(
            (item: MomActionItem, i: number) =>
              `${i + 1}. [${item.status.toUpperCase()}] ${item.task} — ${item.assignee || "Unassigned"}${
                item.dueDate ? ` (Due: ${item.dueDate})` : ""
              }`,
          )
        : [isAr ? "- لا توجد مهام معلقة" : "- None"]),
      "",
      `_iShoot Official Document Reference: ${mom.mom_number}_`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(textLines)}`;
    window.open(url, "_blank");
  };

  const handleApproveAndSign = async () => {
    if (!currentUser) return;
    setIsApproving(true);
    setFeedbackMessage(null);
    try {
      const res = await approveAndSignMomAction(mom.id);

      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: isAr
            ? "تم اعتماد وتوقيع محضر الاجتماع بنجاح!"
            : "MOM approved and signed successfully!",
        });
        router.refresh();
      } else {
        setFeedbackMessage({
          type: "error",
          text: "Failed to approve MOM",
        });
      }
    } catch {
      setFeedbackMessage({
        type: "error",
        text: "An unexpected error occurred while approving.",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;
    setIsSendingEmail(true);
    setFeedbackMessage(null);
    try {
      const res = await shareMomViaEmailAction(mom.id, recipientEmail);
      if (res.success && res.status !== "failed") {
        setFeedbackMessage({
          type: "success",
          text: isAr
            ? (res.status === "accepted" ? `قبل مزود البريد الرسالة إلى ${recipientEmail}` : `تمت إضافة البريد إلى قائمة الإرسال إلى ${recipientEmail}`)
            : (res.status === "accepted" ? `Email provider accepted the message to ${recipientEmail}` : `Email queued for ${recipientEmail}`),
        });
        setIsEmailModalOpen(false);
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.message || "Failed to send email",
        });
      }
    } catch {
      setFeedbackMessage({
        type: "error",
        text: "Error sending email.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const canSign = mom.status !== "approved" && !!currentUser && can("moms", "approve");

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <Link
            href="/dashboard/moms"
            className="inline-flex items-center gap-2 text-xs text-[#9EADA9] hover:text-[#09937F] transition-colors mb-2 font-medium"
          >
            <BackIcon className="w-4 h-4" />
            <span>
              {isAr
                ? "العودة إلى محاضر الاجتماعات"
                : "Back to Minutes of Meetings"}
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {mom.mom_number}
            </h1>
            <StatusBadge status={mom.status} />
            {mom.client_id && (
              <Link
                href={`/dashboard/crm/customers/${mom.client_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F5F2] text-[#014842] dark:bg-[#152B27] dark:text-[#7DE0D1] border border-[#09937F]/30 hover:underline transition-colors"
                title="View Client 360"
              >
                <span>{clientName}</span>
                <span className="text-[10px] opacity-70">↗</span>
              </Link>
            )}
            {mom.deal_title && (
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 font-mono">
                Deal: {mom.deal_title}
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة / PDF" : "Print / PDF"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEmailModalOpen(true)}
            className="gap-1.5 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <Mail className="w-4 h-4" />
            <span>{isAr ? "إرسال بالبريد" : "Share Email"}</span>
          </Button>

          {canSign && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleApproveAndSign}
              disabled={isApproving}
              className="gap-1.5 bg-[#09937F] hover:bg-[#077a68] text-white shadow-lg shadow-[#09937F]/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isApproving
                  ? isAr
                    ? "جارٍ الاعتماد..."
                    : "Signing..."
                  : isAr
                    ? "اعتماد وتوقيع"
                    : "Approve & Sign"}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 no-print ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Printable Master Document Sheet (Unified Concept with Invoices & Receipts) */}
      <div className="p-2 sm:p-6 bg-slate-100/70 dark:bg-[#070C0A] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm flex justify-center">
        <div
          dir={isAr ? "rtl" : "ltr"}
          data-print-target
          className={`w-full max-w-[850px] mx-auto bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden min-h-[1050px] print:min-h-0 print:shadow-none print:rounded-none print:max-w-none print:w-full print:overflow-visible ${
            isAr ? "font-arabic" : "font-sans"
          }`}
        >
          {/* Document Letterhead */}
          <DocumentLetterhead
            documentType="mom"
            documentNumber={mom.mom_number}
            titleEn="MINUTES OF MEETING"
            titleAr="محضر اجتماع رسمي"
            company={company}
            language={isAr ? "ar" : "en"}
            issueDateLabel={isAr ? "تاريخ الاجتماع" : "Meeting Date"}
            issueDate={formattedDate}
            secondaryDateLabel={isAr ? "التوقيت والمقر" : "Time & Venue"}
            secondaryDate={timeLocationString || undefined}
            statusLabel={isAr ? "حالة المحضر" : "Document Status"}
            statusValue={mom.status.toUpperCase()}
            clientSectionTitle={
              isAr ? "الطرف المعني / العميل" : "Meeting Context & Entity"
            }
            client={{
              id: mom.client_id,
              name:
                mom.client_name ||
                (isAr ? "اجتماع داخلي / استراتيجي" : "Internal Session"),
            }}
          />

          {/* Document Body */}
          <div className="p-8 sm:p-10 space-y-8 print:p-6 print:space-y-6">
            {/* Title & Subject Block */}
            <div className="border-b-2 border-slate-900 pb-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#09937F] block mb-1">
                {isAr
                  ? "موضوع وجدول الاجتماع الرئيسي"
                  : "Session Subject & Focus"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
                {mom.title}
              </h2>
              {mom.title_ar && mom.title_ar !== mom.title && (
                <h3 className="text-base sm:text-lg font-semibold text-slate-600 font-arabic mt-1">
                  {mom.title_ar}
                </h3>
              )}
            </div>

            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#09937F]" />
                  <span>{isAr ? "التاريخ" : "Date"}</span>
                </span>
                <p className="font-semibold text-slate-800">
                  {new Date(mom.meeting_date).toISOString().split("T")[0]}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#09937F]" />
                  <span>{isAr ? "الوقت" : "Timing"}</span>
                </span>
                <p className="font-semibold text-slate-800">
                  {mom.start_time || "—"}{" "}
                  {mom.end_time ? `to ${mom.end_time}` : ""}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#09937F]" />
                  <span>{isAr ? "الموقع" : "Location"}</span>
                </span>
                <p
                  className="font-semibold text-slate-800 truncate"
                  title={mom.location || ""}
                >
                  {mom.location ||
                    (isAr ? "مكتب آي شوت / عن بعد" : "iShoot HQ / Remote")}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#09937F]" />
                  <span>{isAr ? "المعد" : "Recorded By"}</span>
                </span>
                <p className="font-semibold text-slate-800 truncate">
                  {mom.created_by_name || "Admin"}
                </p>
              </div>
            </div>

            {/* Attendees Table */}
            {mom.attendees && mom.attendees.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Users className="w-4 h-4 text-[#09937F]" />
                  <span>
                    {isAr
                      ? "سجل الحضور والمشاركين"
                      : "Attendees & Stakeholders"}
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 text-start font-bold">#</th>
                        <th className="py-2.5 px-3 text-start font-bold">
                          {isAr ? "الاسم" : "Name"}
                        </th>
                        <th className="py-2.5 px-3 text-start font-bold">
                          {isAr ? "المسمى / الجهة" : "Role / Entity"}
                        </th>
                        <th className="py-2.5 px-3 text-center font-bold">
                          {isAr ? "حالة الحضور" : "Attendance"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mom.attendees.map((att: MomAttendee, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] w-10">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {att.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {att.role || att.organization || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                att.attended
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

            {/* Agenda & Discussion Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agenda */}
              {mom.agenda && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-[#09937F]" />
                    <span>{isAr ? "جدول الأعمال" : "Meeting Agenda"}</span>
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-line">
                    {mom.agenda}
                  </div>
                </div>
              )}

              {/* General Notes */}
              {mom.notes && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#09937F]" />
                    <span>
                      {isAr ? "ملاحظات تنظيمية" : "Administrative Notes"}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-line">
                    {mom.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Discussion Points */}
            {mom.discussion_points && mom.discussion_points.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5">
                  {isAr
                    ? "أبرز محاور النقاش والمداولات"
                    : "Key Discussion Points & Minutes"}
                </h3>
                <div className="space-y-2.5">
                  {mom.discussion_points.map(
                    (point: MomDiscussionPoint, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-800 leading-relaxed"
                      >
                        <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                          <span className="w-5 h-5 rounded-full bg-[#09937F]/10 text-[#09937F] flex items-center justify-center text-[10px] font-mono">
                            {i + 1}
                          </span>
                          <span>{point.topic}</span>
                          {point.speaker && (
                            <span className="text-slate-400 font-normal text-[11px]">
                              ({point.speaker})
                            </span>
                          )}
                        </div>
                        <p className="pl-7 text-slate-700 whitespace-pre-line">
                          {point.notes}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Decisions Callout */}
            {mom.decisions && mom.decisions.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-500/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#014842] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#09937F]" />
                  <span>
                    {isAr
                      ? "القرارات المعتمدة في الجلسة"
                      : "Agreed Decisions & Commitments"}
                  </span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-900 font-medium">
                  {mom.decisions.map((dec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#09937F] mt-1.5 shrink-0" />
                      <span>{dec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items Matrix */}
            {mom.action_items && mom.action_items.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <span>
                    {isAr
                      ? "مصفوفة خطة العمل والمهام المسندة"
                      : "Action Items & Accountabilities"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {mom.action_items.length} {isAr ? "مهمة" : "Items"}
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
                          {isAr ? "المهمة والتسليم المطلوب" : "Action Item"}
                        </th>
                        <th className="py-2.5 px-3 text-start font-bold w-36">
                          {isAr ? "المسؤول" : "Assignee"}
                        </th>
                        <th className="py-2.5 px-3 text-start font-bold w-28">
                          {isAr ? "موعد التسليم" : "Due Date"}
                        </th>
                        <th className="py-2.5 px-3 text-center font-bold w-24">
                          {isAr ? "الحالة" : "Status"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mom.action_items.map((act: MomActionItem, i: number) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50/50 print-avoid-break"
                        >
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px] align-top">
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
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                act.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : act.status === "in_progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {act.status}
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

          {/* Unified Document Footer with Stamp & Digital Signature */}
          <DocumentFooter
            company={company}
            language={isAr ? "ar" : "en"}
            thankYouMessage={
              isAr
                ? "تم توثيق محضر الاجتماع واعتماده رسمياً لدى شركة آي شوت للإنتاج الإعلامي"
                : "Official Record of Proceedings & Commitments — iShoot Media Production"
            }
            showSignature={true}
            stampUrl={company.stamp_url}
            signatureUrl={mom.signature_url || null}
            signerName={
              mom.approved_by_name ||
              mom.created_by_name ||
              (isAr
                ? "رئيس الجلسة / المسؤول التنفيذي"
                : "Session Lead / Executive Officer")
            }
            signatureTitle={isAr ? "المسجل والمعتمد" : "Recorder & Approver"}
            signatureTitleAr="المسجل والمعتمد"
          />
        </div>
      </div>

      {/* Share Via Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-[#0E1714] border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#09937F]" />
                <span>
                  {isAr
                    ? "إرسال محضر الاجتماع عبر البريد"
                    : "Share MOM via Email"}
                </span>
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "البريد الإلكتروني للمستلم" : "Recipient Email"}
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="partner@client.com"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr
                    ? "ملاحظة أو رسالة مرفقة (اختياري)"
                    : "Message / Note (Optional)"}
                </label>
                <textarea
                  rows={3}
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  placeholder={
                    isAr
                      ? "يرجى الاطلاع على محضر الاجتماع المرفق والتواصل معنا لأي ملاحظات."
                      : "Please find attached the official MOM for your review."
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(false)}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSendingEmail}
                  className="bg-[#09937F] hover:bg-[#077a68] text-white"
                >
                  {isSendingEmail
                    ? isAr
                      ? "جارٍ الإرسال..."
                      : "Sending..."
                    : isAr
                      ? "إرسال الآن"
                      : "Send Email"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
