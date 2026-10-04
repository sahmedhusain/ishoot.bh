"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  ShieldAlert,
  Layers,
  FileQuestion,
  HelpCircle,
  MessageSquare,
  History,
  FileText,
  UserCheck,
  ArrowRightLeft,
  Lock,
  Eye,
  Plus,
  Send,
} from "lucide-react";
import { Button, StatusBadge } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { canTransitionRequest } from "@ishoot/database/constants/requests";
import {
  assignRequestWithAvailabilityAction,
  approveRequestAction,
  submitRequestForApprovalAction,
  confirmRequestAction,
  returnRequestAction,
  resolveRequestAction,
  addRequestCommentAction,
} from "../../app/actions/requests";

interface UserOption {
  id: string;
  name: string;
  role: string;
  department?: string | null;
}

interface RequestDetailViewProps {
  request: any;
  users: UserOption[];
  currentUserId: string;
  /** Server-computed: the viewer is an approver for this request's pending approval. */
  canDecideApproval: boolean;
}

const TEAMS = [
  { id: "production", labelEn: "Production", labelAr: "فريق الإنتاج" },
  {
    id: "post_production",
    labelEn: "Post-Production",
    labelAr: "المونتاج وما بعد الإنتاج",
  },
  {
    id: "finance",
    labelEn: "Finance & Accounts",
    labelAr: "المالية والحسابات",
  },
  {
    id: "sales",
    labelEn: "Sales & Client Relations",
    labelAr: "المبيعات وعلاقات العملاء",
  },
  { id: "support", labelEn: "Customer Care", labelAr: "خدمة ودعم العملاء" },
];

export function RequestDetailView({
  request,
  users,
  currentUserId,
  canDecideApproval,
}: RequestDetailViewProps) {
  const router = useRouter();
  const { isRTL, t } = useAdminLocale();

  const [activeTab, setActiveTab] = React.useState<
    "overview" | "comments" | "timeline" | "related"
  >("overview");

  // Modals
  const [modalType, setModalType] = React.useState<
    "assign" | "return" | "resolve" | null
  >(null);
  const [modalAssigneeId, setModalAssigneeId] = React.useState<string>(
    request.assignedToId || users[0]?.id || "",
  );
  const [modalTeam, setModalTeam] = React.useState<string>(
    request.team || "production",
  );
  const [modalNotes, setModalNotes] = React.useState<string>("");
  const [isActionSubmitting, setIsActionSubmitting] =
    React.useState<boolean>(false);

  // New Comment State
  const [commentBody, setCommentBody] = React.useState<string>("");
  const [isClientVisible, setIsClientVisible] = React.useState<boolean>(false);
  const [isPostingComment, setIsPostingComment] =
    React.useState<boolean>(false);

  const { can } = usePermissions();
  const canAssign = can("requests", "assign");
  const canApprove = can("requests", "approve");
  const canWrite = can("requests", "write");

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "CR":
      case "complaint":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{isRTL ? "شكوى عميل (CR)" : "Client Complaint (CR)"}</span>
          </span>
        );
      case "SR":
      case "service_request":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isRTL ? "طلب خدمة (SR)" : "Service Request (SR)"}</span>
          </span>
        );
      case "quote_request":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
            <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
            <span>{isRTL ? "طلب عرض سعر" : "Quote Request"}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300/40">
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            <span>{isRTL ? "استفسار عام" : "Inquiry"}</span>
          </span>
        );
    }
  };

  const getWorkflowBadge = (status?: string | null) => {
    const s = status || "received";
    switch (s) {
      case "received":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{isRTL ? "مستلم جديد" : "Received"}</span>
          </span>
        );
      case "assigned":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50">
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>{isRTL ? "مُعيّن ومُتابع" : "Assigned"}</span>
          </span>
        );
      case "pending_approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>{isRTL ? "بانتظار الاعتماد" : "Pending Approval"}</span>
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isRTL ? "معتمد" : "Approved"}</span>
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50">
            <UserCheck className="w-3.5 h-3.5 text-purple-500" />
            <span>{isRTL ? "مؤكّد تنفيذي" : "Confirmed"}</span>
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50">
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>{isRTL ? "مُعاد للاستكمال" : "Returned"}</span>
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isRTL ? "مكتمل ومغلق" : "Resolved & Closed"}</span>
          </span>
        );
      default:
        return <StatusBadge status={s} />;
    }
  };

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case "urgent":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
            {isRTL ? "عاجل جداً" : "Urgent SLA"}
          </span>
        );
      case "high":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            {isRTL ? "مرتفع" : "High"}
          </span>
        );
      case "low":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400">
            {isRTL ? "منخفض" : "Low"}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
            {isRTL ? "عادي" : "Normal"}
          </span>
        );
    }
  };

  const handleApprove = async () => {
    const toastId = toast.loading(t.requestWorkflow.approving);
    try {
      await approveRequestAction(request.id, {});
      toast.success(t.requestWorkflow.approved, { id: toastId });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.requestWorkflow.failed, { id: toastId });
    }
  };

  const handleSubmitForApproval = async () => {
    const toastId = toast.loading(t.requestWorkflow.submitting);
    try {
      await submitRequestForApprovalAction(request.id, {});
      toast.success(t.requestWorkflow.submitted, { id: toastId });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.requestWorkflow.failed, { id: toastId });
    }
  };

  const handleConfirm = async () => {
    const toastId = toast.loading(
      isRTL ? "جارٍ تأكيد الطلب تنفيذاً..." : "Confirming request...",
    );
    try {
      const res = await confirmRequestAction(request.id, {
        notes: "Confirmed for execution",
      });
      if (res.success) {
        toast.success(
          isRTL ? "تم تأكيد الطلب بنجاح" : "Request confirmed successfully",
          { id: toastId },
        );
        router.refresh();
      } else {
        toast.error(res.error || "Confirmation failed", { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred", { id: toastId });
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionSubmitting(true);
    const toastId = toast.loading(
      isRTL ? "جارٍ تنفيذ الإجراء..." : "Executing action...",
    );

    try {
      if (modalType === "assign") {
        const res = await assignRequestWithAvailabilityAction(request.id, {
          assignedToId: modalAssigneeId,
          team: modalTeam,
          reason: modalNotes.trim() || undefined,
        });
        if (res.success) {
          toast.success(
            isRTL
              ? "تم تعيين الطلب بنجاح مع فحص الإتاحة"
              : "Assigned successfully with leave availability check",
            { id: toastId },
          );
          setModalType(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to assign request", { id: toastId });
        }
      } else if (modalType === "return") {
        if (!modalNotes.trim()) {
          toast.error(
            isRTL
              ? "يرجى كتابة سبب الإرجاع للمسؤول"
              : "Return reason is required",
            { id: toastId },
          );
          setIsActionSubmitting(false);
          return;
        }
        const res = await returnRequestAction(request.id, {
          reason: modalNotes.trim(),
        });
        if (res.success) {
          toast.success(
            isRTL ? "تم إرجاع الطلب بنجاح" : "Request returned successfully",
            { id: toastId },
          );
          setModalType(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to return request", { id: toastId });
        }
      } else if (modalType === "resolve") {
        if (!modalNotes.trim()) {
          toast.error(
            isRTL
              ? "يرجى كتابة ملخص الحل والتسليم"
              : "Resolution summary is required",
            { id: toastId },
          );
          setIsActionSubmitting(false);
          return;
        }
        const res = await resolveRequestAction(request.id, {
          resolutionNotes: modalNotes.trim(),
        });
        if (res.success) {
          toast.success(
            isRTL
              ? "تم إغلاق وحل الطلب بنجاح"
              : "Request resolved and closed successfully",
            { id: toastId },
          );
          setModalType(null);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to resolve request", {
            id: toastId,
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed", { id: toastId });
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    setIsPostingComment(true);
    const toastId = toast.loading(
      isRTL ? "جارٍ إضافة التعليق..." : "Posting comment...",
    );
    try {
      const res = await addRequestCommentAction(
        request.id,
        commentBody.trim(),
        isClientVisible,
      );
      if (res.success) {
        toast.success(
          isRTL ? "تمت إضافة التعليق بنجاح" : "Comment added successfully",
          { id: toastId },
        );
        setCommentBody("");
        setIsClientVisible(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to add comment", { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to add comment", { id: toastId });
    } finally {
      setIsPostingComment(false);
    }
  };

  const slaDateObj = request.slaDueDate ? new Date(request.slaDueDate) : null;
  const isOverdue = slaDateObj && slaDateObj.getTime() < Date.now();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Top Breadcrumb & Reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={ROUTES.requests.list}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>
            {isRTL ? "العودة لصندوق الطلبات" : "Back to Requests Inbox"}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {getTypeBadge(request.requestType)}
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10">
            {request.reference || `#${request.id.slice(-6)}`}
          </span>
          {getWorkflowBadge(request.workflowStatus)}
          {getPriorityBadge(request.priority)}
        </div>
      </div>

      {/* Main Dossier Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {request.subject ||
                (isRTL
                  ? `طلب رقم: ${request.reference}`
                  : `Request ${request.reference}`)}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(request.createdAt).toLocaleDateString(
                    isRTL ? "ar-BH" : "en-US",
                    { dateStyle: "long" },
                  )}
                </span>
              </span>
              {slaDateObj && (
                <span
                  className={`flex items-center gap-1.5 font-medium ${
                    isOverdue ? "text-rose-600" : "text-amber-600"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isRTL ? "استحقاق الخدمة: " : "SLA Deadline: "}
                    {slaDateObj.toLocaleDateString(isRTL ? "ar-BH" : "en-US", {
                      dateStyle: "medium",
                    })}
                  </span>
                  {isOverdue && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {isRTL ? "متأخر" : "Overdue"}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {canAssign && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalType("assign")}
                className="gap-1.5 text-xs text-blue-600 hover:text-blue-700"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>
                  {request.assignedToId
                    ? isRTL
                      ? "إعادة التوجيه"
                      : "Reassign"
                    : isRTL
                      ? "تعيين مسؤول"
                      : "Assign Lead"}
                </span>
              </Button>
            )}

            {canWrite && canTransitionRequest(request.workflowStatus, "submit") && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitForApproval}
                className="gap-1.5 text-xs bg-[#014842] hover:bg-[#013833] text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.requestWorkflow.submitForApproval}</span>
              </Button>
            )}

            {request.workflowStatus === "pending_approval" &&
              (canDecideApproval ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  className="gap-1.5 text-xs bg-[#09937F] hover:bg-[#077a68] text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.requestWorkflow.approve}</span>
                </Button>
              ) : (
                <span className="text-xs text-slate-500">{t.requestWorkflow.awaitingApproval}</span>
              ))}

            {canApprove && request.workflowStatus === "approved" && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{isRTL ? "تأكيد تنفيذي" : "Confirm"}</span>
              </Button>
            )}

            {request.workflowStatus !== "returned" &&
              request.workflowStatus !== "resolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalType("return")}
                  className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isRTL ? "إرجاع" : "Return"}</span>
                </Button>
              )}

            {request.workflowStatus !== "resolved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalType("resolve")}
                className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isRTL ? "حل وإغلاق" : "Resolve"}</span>
              </Button>
            )}

            <Link
              href={ROUTES.quotations.create({ clientId: request.customerId, dealId: request.convertedDeal?.id, inquiryId: request.id })}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isRTL ? "إصدار عرض سعر" : "Create Quote"}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
          {[
            {
              id: "overview",
              labelEn: "Overview & Specs",
              labelAr: "الملف والمواصفات",
              count: null,
            },
            {
              id: "comments",
              labelEn: "Discussion & Notes",
              labelAr: "المناقشة والملاحظات",
              count: request.comments?.length || 0,
            },
            {
              id: "timeline",
              labelEn: "Audit Timeline",
              labelAr: "سجل العمليات والتعيينات",
              count:
                (request.requestEvents?.length || 0) +
                (request.assignments?.length || 0),
            },
            {
              id: "related",
              labelEn: "Linked Documents",
              labelAr: "المستندات المرتبطة",
              count: request.quotations?.length || 0,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-[#09937F] text-white shadow-sm shadow-[#09937F]/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{isRTL ? tab.labelAr : tab.labelEn}</span>
              {tab.count !== null && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Description & Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F]">
                {isRTL
                  ? "نص المتطلبات الفنية والوصف"
                  : "Technical Scope & Requirements"}
              </h3>
              <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-slate-200/50 dark:border-white/5">
                {request.message}
              </div>

              {request.serviceType && (
                <div className="pt-2">
                  <span className="text-xs text-slate-400 block mb-1">
                    {isRTL ? "الخدمات المطلوبة:" : "Requested Services:"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {request.serviceType.split(",").map((s: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Commercial & Operational Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
                <span className="text-xs text-slate-400">
                  {isRTL ? "الميزانية المتوقعة" : "Budget Range"}
                </span>
                <div className="text-base font-bold text-slate-900 dark:text-white font-display">
                  {request.budgetRange || "—"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
                <span className="text-xs text-slate-400">
                  {isRTL ? "الجدول الزمني المستهدف" : "Target Timeline"}
                </span>
                <div className="text-base font-bold text-slate-900 dark:text-white font-display">
                  {request.timeline || "—"}
                </div>
              </div>
            </div>

            {request.returnReason && (
              <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/30 text-rose-900 dark:text-rose-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {isRTL
                      ? "سبب الإرجاع للاستكمال:"
                      : "Return Reason / Correction Request:"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed">{request.returnReason}</p>
              </div>
            )}

            {request.resolutionNotes && (
              <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <Check className="w-4 h-4" />
                  <span>
                    {isRTL
                      ? "ملخص الحل والتسليم المعتمد:"
                      : "Resolution Summary & Completion Notes:"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed">
                  {request.resolutionNotes}
                </p>
              </div>
            )}
          </div>

          {/* Right Col: Client & Assignment Info */}
          <div className="space-y-6">
            {/* Client Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F]">
                  {isRTL ? "بيانات العميل" : "Client Dossier"}
                </h3>
                {request.customerId && (
                  <Link
                    href={ROUTES.crm.customer(request.customerId)}
                    className="text-[11px] text-[#09937F] hover:underline"
                  >
                    {isRTL ? "عرض الملف" : "View Profile"}
                  </Link>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isRTL ? "الاسم" : "Full Name"}
                  </span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{request.name}</span>
                  </div>
                </div>

                {request.companyName && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {isRTL ? "الشركة" : "Company"}
                    </span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{request.companyName}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isRTL ? "البريد الإلكتروني" : "Email"}
                  </span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a
                      href={`mailto:${request.email}`}
                      className="hover:underline"
                    >
                      {request.email}
                    </a>
                  </div>
                </div>

                {request.phone && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {isRTL ? "الهاتف" : "Phone"}
                    </span>
                    <div
                      className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 font-mono"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${request.phone}`} className="hover:underline">
                        {request.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Assignment Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F]">
                {isRTL ? "المسؤولية الإدارية الحالية" : "Current Assignment"}
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isRTL ? "الفريق المكلف" : "Assigned Team"}
                  </span>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 font-semibold text-slate-800 dark:text-slate-200 capitalize mt-1">
                    {request.team || "support"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isRTL ? "الموظف المباشر" : "Direct Assignee"}
                  </span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#09937F]" />
                    <span>
                      {request.assignedTo?.fullName ||
                        (isRTL ? "غير مُعيّن بعد" : "Unassigned")}
                    </span>
                  </div>
                  {request.assignedTo?.email && (
                    <span className="text-[11px] text-slate-400 font-mono block pl-5 rtl:pr-5">
                      {request.assignedTo.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Comments & Discussion */}
      {activeTab === "comments" && (
        <div className="space-y-6">
          {/* Post Comment Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F] flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>{isRTL ? "إضافة ملاحظة أو رد جديد" : "Post Note / Comment"}</span>
            </h3>

            <form onSubmit={handlePostComment} className="space-y-3">
              <textarea
                rows={3}
                required
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={
                  isRTL
                    ? "اكتب التوجيه الفني، تفاصيل المتابعة مع العميل، أو ملاحظات الفريق الداخلي..."
                    : "Add progress note, client communication summary, or internal instructions..."
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isClientVisible}
                    onChange={(e) => setIsClientVisible(e.target.checked)}
                    className="rounded border-slate-300 text-[#09937F] focus:ring-[#09937F]"
                  />
                  <span>
                    {isRTL
                      ? "مرئي للعميل (Client Visible)"
                      : "Client Visible (External)"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isClientVisible
                      ? isRTL
                        ? "(سيظهر في بوابة العميل)"
                        : "(Visible in client portal)"
                      : isRTL
                        ? "(خاص بالفريق الداخلي فقط)"
                        : "(Internal team only)"}
                  </span>
                </label>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPostingComment || !commentBody.trim()}
                  className="bg-[#09937F] hover:bg-[#077a68] text-white gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>
                    {isPostingComment
                      ? isRTL
                        ? "جارٍ النشر..."
                        : "Posting..."
                      : isRTL
                        ? "نشر الملاحظة"
                        : "Post Comment"}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Comments List */}
          <div className="space-y-3">
            {request.comments && request.comments.length > 0 ? (
              request.comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    comment.isClientVisible
                      ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-900/30"
                      : "bg-white dark:bg-[#0E1714] border-slate-200/80 dark:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                        {comment.author?.fullName?.[0] || "U"}
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          {comment.author?.fullName || "Team Member"}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(comment.createdAt).toLocaleString(
                            isRTL ? "ar-BH" : "en-US",
                          )}
                        </span>
                      </div>
                    </div>

                    {comment.isClientVisible ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                        <Eye className="w-3 h-3 text-sky-600" />
                        <span>
                          {isRTL ? "مرئي للعميل" : "Client Visible"}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{isRTL ? "داخلي فقط" : "Internal"}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-9 rtl:pr-9">
                    {comment.body}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 bg-white dark:bg-[#0E1714] rounded-2xl border border-slate-200/80 dark:border-white/10">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">
                  {isRTL
                    ? "لا توجد ملاحظات أو تعليقات مسجلة بعد"
                    : "No comments posted yet"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Timeline & Audit History */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F] flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>
              {isRTL
                ? "سجل العمليات والتعيينات غير القابل للتعديل"
                : "Append-Only Audit & Assignment History"}
            </span>
          </h3>

          <div className="space-y-4 pl-4 rtl:pr-4 rtl:pl-0 border-l-2 rtl:border-r-2 rtl:border-l-0 border-slate-200 dark:border-white/10">
            {request.requestEvents && request.requestEvents.length > 0 ? (
              request.requestEvents.map((ev: any) => (
                <div key={ev.id} className="relative space-y-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#09937F] absolute -left-[21px] rtl:-right-[21px] top-1" />
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <span className="capitalize font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10">
                      {ev.eventType}
                    </span>
                    <span className="text-slate-400 font-normal">
                      by {ev.actor?.fullName || "System"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono ml-auto rtl:mr-auto">
                      {new Date(ev.createdAt).toLocaleString(
                        isRTL ? "ar-BH" : "en-US",
                      )}
                    </span>
                  </div>

                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {JSON.stringify(ev.details, null, 2)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                {isRTL ? "لا توجد أحداث مسجلة" : "No event records found"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Linked Documents */}
      {activeTab === "related" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>
                  {isRTL
                    ? "عروض الأسعار الصادرة لهذا الطلب"
                    : "Issued Quotations"}
                </span>
              </h3>
              <Link
                href={ROUTES.quotations.create({ clientId: request.customerId, dealId: request.convertedDeal?.id, inquiryId: request.id })}
              >
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <Plus className="w-3 h-3" />
                  <span>{isRTL ? "عرض سعر جديد" : "New Quotation"}</span>
                </Button>
              </Link>
            </div>

            {request.quotations && request.quotations.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {request.quotations.map((q: any) => (
                  <div
                    key={q.id}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <Link
                        href={ROUTES.quotations.detail(q.id)}
                        className="font-mono font-bold text-slate-900 dark:text-white hover:text-[#09937F] transition-colors"
                      >
                        {q.quotationNumber}
                      </Link>
                      <div className="text-[11px] text-slate-400">
                        {q.totalAmount} BHD
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={q.status} />
                      <Link href={ROUTES.quotations.detail(q.id)}>
                        <Button variant="outline" size="sm" className="text-xs">
                          {isRTL ? "عرض" : "View"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                {isRTL
                  ? "لم يتم إصدار عروض أسعار لهذا الطلب بعد"
                  : "No quotations linked to this request"}
              </p>
            )}
          </div>

          {request.convertedDeal && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F]">
                {isRTL ? "الصفقة التجارية في CRM" : "CRM Deal Conversion"}
              </h3>
              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {request.convertedDeal.title}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {isRTL ? "المرحلة:" : "Stage:"}{" "}
                    {request.convertedDeal.dealStage}
                  </span>
                </div>
                <Link href={ROUTES.crm.deal(request.convertedDeal.id)}>
                  <Button variant="outline" size="sm" className="text-xs">
                    {isRTL ? "عرض الصفقة" : "View Deal"}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1714] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#09937F]" />
                  <span>
                    {modalType === "assign" &&
                      (isRTL
                        ? "تعيين أو إعادة توجيه الطلب"
                        : "Assign or Reassign Request")}
                    {modalType === "return" &&
                      (isRTL
                        ? "إرجاع الطلب مع ذكر السبب"
                        : "Return Request with Reason")}
                    {modalType === "resolve" &&
                      (isRTL
                        ? "حل وإغلاق الطلب رسمياً"
                        : "Resolve & Close Request")}
                  </span>
                </h3>
                <span className="text-xs text-slate-400">
                  {request.reference || `#${request.id.slice(-6)}`}
                </span>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {modalType === "assign" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isRTL ? "الفريق المختص" : "Assigned Team"}
                    </label>
                    <select
                      value={modalTeam}
                      onChange={(e) => setModalTeam(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                    >
                      {TEAMS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {isRTL ? t.labelAr : t.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isRTL
                        ? "الموظف المسؤول (يخضع لفحص الإجازة)"
                        : "Assignee Person (Checked against Leave)"}
                    </label>
                    <select
                      value={modalAssigneeId}
                      onChange={(e) => setModalAssigneeId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {isRTL
                        ? "سيتم رفض التعيين في حال وجود إجازة معتمدة للموظف تغطي فترة العمل"
                        : "Assignment will be rejected if the employee has an approved leave overlapping the work period"}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {modalType === "return"
                    ? isRTL
                      ? "سبب الإرجاع وملاحظات التصحيح *"
                      : "Reason for Return (Required) *"
                    : modalType === "resolve"
                      ? isRTL
                        ? "تقرير الحل وملخص التسليم *"
                        : "Resolution Summary & Output *"
                      : isRTL
                        ? "ملاحظات وتوجيهات التعيين (اختياري)"
                        : "Assignment Directives (Optional)"}
                </label>
                <textarea
                  rows={3}
                  required={modalType === "return" || modalType === "resolve"}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder={
                    modalType === "return"
                      ? isRTL
                        ? "اكتب تفاصيل النواقص وسبب إعادة الطلب..."
                        : "Describe reason for returning this request..."
                      : modalType === "resolve"
                        ? isRTL
                          ? "اكتب تفاصيل إنجاز العمل أو تسليم الخدمة..."
                          : "Describe how this issue/service was successfully resolved..."
                        : isRTL
                          ? "أي تعليمات أو ملاحظات إضافية للموظف المكلف..."
                          : "Any instructions for the new assignee..."
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalType(null)}
                  disabled={isActionSubmitting}
                >
                  {isRTL ? "إلغاء التراجع" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isActionSubmitting}
                  className={
                    modalType === "return"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-[#09937F] hover:bg-[#077a68] text-white"
                  }
                >
                  {isActionSubmitting
                    ? isRTL
                      ? "جارٍ التنفيذ..."
                      : "Applying..."
                    : isRTL
                      ? "تأكيد وتنفيذ"
                      : "Confirm & Apply"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
