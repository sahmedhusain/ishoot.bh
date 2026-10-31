"use client";
import { useCompanyCurrency } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
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
  RotateCcw,
  Check,
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
import { Button, CurrencyDisplay, StatusBadge, Modal, Select, Textarea } from "@platform/ui";
import type { ConsolidatedRequest } from "@platform/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { REQUEST_TEAMS, canTransitionRequest, requestKindOf } from "@platform/database/constants/requests";
import { RequestManagePanel } from "./RequestManagePanel";
import { RequestPriorityBadge, RequestTypeBadge, RequestWorkflowBadge } from "./RequestBadges";
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
  request: ConsolidatedRequest;
  users: UserOption[];
  currentUserId: string;
  /** Server-computed: the viewer is an approver for this request's pending approval. */
  canDecideApproval: boolean;
  /** Server-computed: may qualify, link and convert sales leads. */
  canSell: boolean;
}


export function RequestDetailView({
  request,
  users,
  currentUserId,
  canDecideApproval,
  canSell,
}: RequestDetailViewProps) {
  const companyCurrency = useCompanyCurrency();
  const router = useRouter();
  const { isRTL, t } = useAdminLocale();

  const [activeTab, setActiveTab] = React.useState<
    "overview" | "comments" | "timeline" | "related"
  >("overview");

  // Modals
  const [modalType, setModalType] = React.useState<
    "assign" | "return" | "resolve" | null
  >(null);
  const actionFormId = React.useId();
  const actionPending = React.useRef(false);
  const [actionError, setActionError] = React.useState("");
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

  const handleApprove = async () => {
    const toastId = toast.loading(t.requestWorkflow.approving);
    try {
      await approveRequestAction(request.id, {});
      toast.success(t.requestWorkflow.approved, { id: toastId });
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e, t, t.requestWorkflow.failed), { id: toastId });
    }
  };

  const handleSubmitForApproval = async () => {
    const toastId = toast.loading(t.requestWorkflow.submitting);
    try {
      await submitRequestForApprovalAction(request.id, {});
      toast.success(t.requestWorkflow.submitted, { id: toastId });
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e, t, t.requestWorkflow.failed), { id: toastId });
    }
  };

  const handleConfirm = async () => {
    const toastId = toast.loading(
      t.requestDetail.confirmingRequest,
    );
    try {
      const res = await confirmRequestAction(request.id, {
        notes: t.copy.confirmedExecution,
      });
      if (res.success) {
        toast.success(
          t.requestDetail.requestConfirmedSuccessfully,
          { id: toastId },
        );
        router.refresh();
      } else {
        toast.error(res.error || t.requestDetail.confirmationFailed, { id: toastId });
      }
    } catch (e: any) {
      toast.error(errorMessage(e, t, t.requestDetail.anErrorOccurred), { id: toastId });
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionPending.current || !modalType) return;
    actionPending.current = true; setActionError("");
    setIsActionSubmitting(true);
    const toastId = toast.loading(
      t.requestDetail.executingAction,
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
            t.requestDetail.assignedSuccessfullyWithLeaveAvailability,
            { id: toastId },
          );
          setModalType(null);
          router.refresh();
        } else {
          setActionError(errorMessage(res.error, t, t.requestDetail.failedToAssignRequest));
          toast.error(errorMessage(res.error, t, t.requestDetail.failedToAssignRequest), { id: toastId });
        }
      } else if (modalType === "return") {
        if (!modalNotes.trim()) {
          setActionError(t.requestDetail.returnReasonIsRequired);
          toast.error(
            t.requestDetail.returnReasonIsRequired,
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
            t.requestDetail.requestReturnedSuccessfully,
            { id: toastId },
          );
          setModalType(null);
          router.refresh();
        } else {
          setActionError(errorMessage(res.error, t, t.requestDetail.failedToReturnRequest));
          toast.error(errorMessage(res.error, t, t.requestDetail.failedToReturnRequest), { id: toastId });
        }
      } else if (modalType === "resolve") {
        if (!modalNotes.trim()) {
          setActionError(t.requestDetail.resolutionSummaryIsRequired);
          toast.error(
            t.requestDetail.resolutionSummaryIsRequired,
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
            t.requestDetail.requestResolvedAndClosedSuccessfully,
            { id: toastId },
          );
          setModalType(null);
          router.refresh();
        } else {
          setActionError(errorMessage(res.error, t, t.requestDetail.failedToResolveRequest));
          toast.error(errorMessage(res.error, t, t.requestDetail.failedToResolveRequest), {
            id: toastId,
          });
        }
      }
    } catch (err: any) {
      setActionError(errorMessage(err, t, t.requestDetail.actionFailed));
      toast.error(errorMessage(err, t, t.requestDetail.actionFailed), { id: toastId });
    } finally {
      actionPending.current = false; setIsActionSubmitting(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    setIsPostingComment(true);
    const toastId = toast.loading(
      t.requestDetail.postingComment,
    );
    try {
      const res = await addRequestCommentAction(
        request.id,
        commentBody.trim(),
        isClientVisible,
      );
      if (res.success) {
        toast.success(
          t.requestDetail.commentAddedSuccessfully,
          { id: toastId },
        );
        setCommentBody("");
        setIsClientVisible(false);
        router.refresh();
      } else {
        toast.error(res.error || t.requestDetail.failedToAddComment, { id: toastId });
      }
    } catch (e: any) {
      toast.error(errorMessage(e, t, t.requestDetail.failedToAddComment), { id: toastId });
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>
            {t.requestDetail.backToRequestsInbox}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <RequestTypeBadge type={request.requestType} />
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-surface-sunken dark:bg-white/10 text-ink dark:text-ink border border-outline-variant dark:border-white/10">
            {request.reference || `#${request.id.slice(-6)}`}
          </span>
          <RequestWorkflowBadge status={request.workflowStatus} />
          <RequestPriorityBadge priority={request.priority} />
        </div>
      </div>

      {/* Main Dossier Header Card */}
      <div className="p-6 rounded-3xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4" data-page-header>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink font-display">
              {formatMessage(t.requestDetail.titleWithReference, { reference: request.reference })}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted dark:text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(request.createdAt).toLocaleDateString(
                    isRTL ? "ar-u-nu-latn" : "en-US",
                    { dateStyle: "long" },
                  )}
                </span>
              </span>
              {slaDateObj && (
                <span
                  className={`flex items-center gap-1.5 font-medium ${isOverdue ? "text-rose-600" : "text-amber-600"
                    }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {t.requestDetail.slaDeadline}
                    {slaDateObj.toLocaleDateString(isRTL ? "ar-u-nu-latn" : "en-US", {
                      dateStyle: "medium",
                    })}
                  </span>
                  {isOverdue && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {t.requestDetail.overdue}
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
                onClick={() => { setActionError(""); setModalNotes(""); setModalType("assign"); }}
                className="gap-1.5 text-xs text-blue-600 hover:text-blue-700"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>
                  {request.assignedToId
                    ? t.requestDetail.reassign
                    : t.requestDetail.assignLead}
                </span>
              </Button>
            )}

            {canWrite && canTransitionRequest(request.workflowStatus, "submit") && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitForApproval}
                className="gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
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
                  className="gap-1.5 text-xs bg-accent hover:bg-accent-pressed text-accent-foreground"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.requestWorkflow.approve}</span>
                </Button>
              ) : (
                <span className="text-xs text-ink-muted">{t.requestWorkflow.awaitingApproval}</span>
              ))}

            {canApprove && request.workflowStatus === "approved" && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t.requestDetail.confirm}</span>
              </Button>
            )}

            {request.workflowStatus !== "returned" &&
              request.workflowStatus !== "resolved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setActionError(""); setModalNotes(""); setModalType("return"); }}
                  className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.requestDetail.return}</span>
                </Button>
              )}

            {request.workflowStatus !== "resolved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActionError(""); setModalNotes(""); setModalType("resolve"); }}
                className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t.requestDetail.resolve}</span>
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
                <span>{t.requestDetail.createQuote}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-outline-variant dark:border-white/5 pt-3" role="tablist">
          {[
            {
              id: "overview",
              label: t.requestDetail.overviewAndSpecs,
              count: null,
            },
            {
              id: "comments",
              label: t.requestDetail.discussionAndNotes,
              count: request.comments?.length || 0,
            },
            {
              id: "timeline",
              label: t.requestDetail.auditTimeline,
              count:
                (request.requestEvents?.length || 0) +
                (request.assignments?.length || 0),
            },
            {
              id: "related",
              label: t.requestDetail.linkedDocuments,
              count: request.quotations?.length || 0,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === tab.id
                ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20"
                : "bg-surface-sunken dark:bg-white/5 text-ink-muted dark:text-ink-muted hover:text-ink dark:hover:text-white"
                }`}
             tabIndex={activeTab === tab.id ? 0 : -1} role="tab" aria-selected={activeTab === tab.id} type="button">
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-surface-sunken dark:bg-white/10 text-ink-muted dark:text-ink"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-tab-panel>
          {/* Left 2 Cols: Description & Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                {t.requestDetail.technicalScopeAndRequirements}
              </h3>
              <div className="text-sm text-ink dark:text-ink leading-relaxed whitespace-pre-line bg-surface-raised dark:bg-black/30 p-4 rounded-xl border border-outline-variant/50 dark:border-white/5">
                {request.message}
              </div>

              {request.serviceType && (
                <div className="pt-2">
                  <span className="text-xs text-ink-muted block mb-1">
                    {t.requestDetail.requestedServices}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {request.serviceType.split(",").map((s: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-sunken dark:bg-white/10 text-ink dark:text-ink"
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
              <div className="p-5 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-1">
                <span className="text-xs text-ink-muted">
                  {t.requestDetail.budgetRange}
                </span>
                <div className="text-base font-bold text-ink dark:text-ink font-display">
                  {request.budgetRange || "—"}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-1">
                <span className="text-xs text-ink-muted">
                  {t.requestDetail.targetTimeline}
                </span>
                <div className="text-base font-bold text-ink dark:text-ink font-display">
                  {request.timeline || "—"}
                </div>
              </div>
            </div>

            {request.returnReason && (
              <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/30 text-rose-900 dark:text-rose-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {t.requestDetail.returnReasonCorrectionRequest}
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
                    {t.requestDetail.resolutionSummaryAndCompletionNotes}
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
            <div className="p-6 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                  {t.requestDetail.clientDossier}
                </h3>
                {request.customerId && (
                  <Link
                    href={ROUTES.crm.customer(request.customerId)}
                    className="text-[11px] text-accent hover:underline"
                  >
                    {t.requestDetail.viewProfile}
                  </Link>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-ink-muted block text-[11px]">
                    <bdi dir="auto">{t.requestDetail.fullName}</bdi>
                  </span>
                  <div className="font-semibold text-ink dark:text-ink flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-ink-muted" />
                    <span><bdi dir="auto">{request.name}</bdi></span>
                  </div>
                </div>

                {request.companyName && (
                  <div>
                    <span className="text-ink-muted block text-[11px]">
                      {t.requestDetail.company}
                    </span>
                    <div className="font-semibold text-ink dark:text-ink flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-ink-muted" />
                      <span><bdi dir="auto">{request.companyName}</bdi></span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-ink-muted block text-[11px]">
                    <bdi dir="ltr">{t.requestDetail.email}</bdi>
                  </span>
                  <div className="font-semibold text-ink dark:text-ink flex items-center gap-1.5 mt-0.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-ink-muted" />
                    <a
                      href={`mailto:${request.email}`}
                      className="hover:underline"
                    >
                      <bdi dir="ltr">{request.email}</bdi>
                    </a>
                  </div>
                </div>

                {request.phone && (
                  <div>
                    <span className="text-ink-muted block text-[11px]">
                      <bdi dir="ltr">{t.requestDetail.phone}</bdi>
                    </span>
                    <div
                      className="font-semibold text-ink dark:text-ink flex items-center gap-1.5 mt-0.5 font-mono"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5 text-ink-muted" />
                      <a href={`tel:${request.phone}`} className="hover:underline">
                        <bdi dir="ltr">{request.phone}</bdi>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Assignment Card */}
            <div className="p-6 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                {t.requestDetail.currentAssignment}
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-ink-muted block text-[11px]">
                    {t.requestDetail.assignedTeam}
                  </span>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-surface-sunken dark:bg-white/10 font-semibold text-ink dark:text-ink capitalize mt-1">
                    {request.team || "support"}
                  </span>
                </div>

                <div>
                  <span className="text-ink-muted block text-[11px]">
                    {t.requestDetail.directAssignee}
                  </span>
                  <div className="font-semibold text-ink dark:text-ink flex items-center gap-1.5 mt-1">
                    <UserCheck className="w-3.5 h-3.5 text-accent" />
                    <span>
                      <bdi dir="auto">{request.assignedTo?.fullName ||
                        (t.requestDetail.unassigned)}</bdi>
                    </span>
                  </div>
                  {request.assignedTo?.email && (
                    <span className="text-[11px] text-ink-muted font-mono block ps-5 rtl:pe-5">
                      <bdi dir="ltr">{request.assignedTo.email}</bdi>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <RequestManagePanel
              request={{ id: request.id, priority: request.priority, slaDueDate: request.slaDueDate, status: request.status, customerId: request.customerId, convertedDealId: request.convertedDeal?.id ?? null }}
              kind={requestKindOf(request)}
              canManage={canWrite}
              canSell={canSell}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Comments & Discussion */}
      {activeTab === "comments" && (
        <div className="space-y-6" data-tab-panel>
          {/* Post Comment Box */}
          <div className="p-6 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>{t.requestDetail.postNoteComment}</span>
            </h3>

            <form onSubmit={handlePostComment} className="space-y-3">
              <textarea
                rows={3}
                required
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={
                  t.requestDetail.addProgressNoteClientCommunication
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-black/30 text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ink dark:text-ink">
                  <input
                    type="checkbox"
                    checked={isClientVisible}
                    onChange={(e) => setIsClientVisible(e.target.checked)}
                    className="rounded border-outline-variant text-accent focus:ring-accent"
                  />
                  <span>
                    {t.requestDetail.clientVisibleExternal}
                  </span>
                  <span className="text-[10px] text-ink-muted">
                    {isClientVisible
                      ? t.requestDetail.visibleInClientPortal
                      : t.requestDetail.internalTeamOnly}
                  </span>
                </label>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPostingComment || !commentBody.trim()}
                  className="bg-accent hover:bg-accent-pressed text-accent-foreground gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>
                    {isPostingComment
                      ? t.requestDetail.posting
                      : t.requestDetail.postComment}
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
                  className={`p-4 rounded-2xl border transition-all ${comment.isClientVisible
                    ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-900/30"
                    : "bg-surface-raised dark:bg-surface-raised border-outline-variant/80 dark:border-white/10"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface-sunken dark:bg-white/10 flex items-center justify-center font-bold text-xs text-ink dark:text-ink">
                        {comment.author?.fullName?.[0] || "U"}
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-ink dark:text-ink">
                          <bdi dir="auto">{comment.author?.fullName || t.requestDetail.teamMember}</bdi>
                        </span>
                        <span className="text-[10px] text-ink-muted block">
                          {new Date(comment.createdAt).toLocaleString(
                            isRTL ? "ar-u-nu-latn" : "en-US",
                          )}
                        </span>
                      </div>
                    </div>

                    {comment.isClientVisible ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                        <Eye className="w-3 h-3 text-sky-600" />
                        <span>
                          {t.requestDetail.clientVisible}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-sunken text-ink-muted dark:bg-white/10 dark:text-ink-muted">
                        <Lock className="w-3 h-3 text-ink-muted" />
                        <span>{t.requestDetail.internal}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink dark:text-ink leading-relaxed whitespace-pre-line ps-9 rtl:pe-9">
                    {comment.body}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-ink-muted bg-surface-raised dark:bg-surface-raised rounded-2xl border border-outline-variant/80 dark:border-white/10">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">
                  {t.requestDetail.noCommentsPostedYet}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Timeline & Audit History */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-6" data-tab-panel>
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>
              {t.requestDetail.appendOnlyAuditAndAssignment}
            </span>
          </h3>

          <div className="space-y-4 ps-4 rtl:pe-4 rtl:ps-0 border-s-2 rtl:border-e-2 rtl:border-s-0 border-outline-variant dark:border-white/10">
            {request.requestEvents && request.requestEvents.length > 0 ? (
              request.requestEvents.map((ev: any) => (
                <div key={ev.id} className="relative space-y-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent absolute -left-[21px] rtl:-right-[21px] top-1" />
                  <div className="flex items-center gap-2 font-semibold text-ink dark:text-ink">
                    <span className="capitalize font-mono text-[11px] px-2 py-0.5 rounded bg-surface-sunken dark:bg-white/10">
                      {(t.statusLabels as Record<string, string>)[ev.eventType] ?? ev.eventType.replace(/_/g, " ")}
                    </span>
                    <span className="text-ink-muted font-normal">
                      {formatMessage(t.shared.byName, { name: ev.actor?.fullName || t.shared.system })}
                    </span>
                    <span className="text-[10px] text-ink-muted font-mono ms-auto rtl:me-auto">
                      {new Date(ev.createdAt).toLocaleString(
                        isRTL ? "ar-u-nu-latn" : "en-US",
                      )}
                    </span>
                  </div>

                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <div className="p-2.5 rounded-xl bg-surface-raised dark:bg-white/[0.02] border border-outline-variant/60 dark:border-white/5 font-mono text-[11px] text-ink-muted dark:text-ink-muted">
                      {JSON.stringify(ev.details, null, 2)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-ink-muted">
                {t.requestDetail.noEventRecordsFound}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Linked Documents */}
      {activeTab === "related" && (
        <div className="space-y-4" data-tab-panel>
          <div className="p-6 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>
                  {t.requestDetail.issuedQuotations}
                </span>
              </h3>
              <Link
                href={ROUTES.quotations.create({ clientId: request.customerId, dealId: request.convertedDeal?.id, inquiryId: request.id })}
              >
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <Plus className="w-3 h-3" />
                  <span>{t.requestDetail.newQuotation}</span>
                </Button>
              </Link>
            </div>

            {request.quotations && request.quotations.length > 0 ? (
              <div className="divide-y divide-outline-variant dark:divide-white/5">
                {request.quotations.map((q: any) => (
                  <div
                    key={q.id}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <Link
                        href={ROUTES.quotations.detail(q.id)}
                        className="font-mono font-bold text-ink dark:text-ink hover:text-accent transition-colors"
                      >
                        {q.quotationNumber}
                      </Link>
                      <div className="text-[11px] text-ink-muted">
                        <CurrencyDisplay amount={q.totalAmount} currency={q.currency || companyCurrency} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={q.status} />
                      <Link href={ROUTES.quotations.detail(q.id)}>
                        <Button variant="outline" size="sm" className="text-xs">
                          {t.requestDetail.view}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-muted py-4 text-center">
                {t.requestDetail.noQuotationsLinkedToThis}
              </p>
            )}
          </div>

          {request.convertedDeal && (
            <div className="p-6 rounded-2xl bg-surface-raised dark:bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                {t.requestDetail.crmDealConversion}
              </h3>
              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="font-semibold text-ink dark:text-ink">
                    <bdi dir="auto">{request.convertedDeal.title}</bdi>
                  </span>
                  <span className="text-[11px] text-ink-muted block">
                    {t.requestDetail.stage}{" "}
                    {request.convertedDeal.dealStage}
                  </span>
                </div>
                <Link href={ROUTES.crm.deal(request.convertedDeal.id)}>
                  <Button variant="outline" size="sm" className="text-xs">
                    {t.requestDetail.viewDeal}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Modals */}
      <Modal isOpen={!!modalType} onClose={() => setModalType(null)}
        title={modalType === "assign" ? t.requestDetail.assignOrReassignRequest : modalType === "return" ? t.requestDetail.returnRequestWithReason : t.requestDetail.resolveAndCloseRequest}
        description={request.reference || `#${request.id.slice(-6)}`} busy={isActionSubmitting} className="max-w-lg"
        footer={<div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" disabled={isActionSubmitting} onClick={() => setModalType(null)}>{t.requestDetail.cancel}</Button>
          <Button type="submit" form={actionFormId} variant={modalType === "return" ? "danger" : "primary"} disabled={isActionSubmitting}>{isActionSubmitting ? t.requestDetail.applying : t.requestDetail.confirmAndApply}</Button>
        </div>}>
        <form id={actionFormId} onSubmit={handleModalSubmit} onInvalidCapture={() => setActionError(modalType === "return" ? t.requestDetail.returnReasonIsRequired : t.requestDetail.resolutionSummaryIsRequired)}>
          <fieldset disabled={isActionSubmitting} className="space-y-4">
            {modalType === "assign" && (
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${actionFormId}-team`} className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                    {t.requestDetail.assignedTeam2}
                  </label>
                  <Select id={`${actionFormId}-team`}
                    value={modalTeam}
                    onChange={(e) => setModalTeam(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-black/30 text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {REQUEST_TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {t.requestLabels.teams[team]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label htmlFor={`${actionFormId}-assignee`} className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                    {t.requestDetail.assigneePersonCheckedAgainstLeave}
                  </label>
                  <Select id={`${actionFormId}-assignee`}
                    value={modalAssigneeId}
                    onChange={(e) => setModalAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-black/30 text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace("_", " ")})
                      </option>
                    ))}
                  </Select>
                  <span className="text-[11px] text-ink-muted mt-1 block">
                    {t.requestDetail.assignmentWillBeRejectedIf}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor={`${actionFormId}-notes`} className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                {modalType === "return"
                  ? t.requestDetail.reasonForReturnRequired
                  : modalType === "resolve"
                    ? t.requestDetail.resolutionSummaryAndOutput
                    : t.requestDetail.assignmentDirectivesOptional}
              </label>
              <Textarea id={`${actionFormId}-notes`}
                rows={3}
                required={modalType === "return" || modalType === "resolve"}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder={
                  modalType === "return"
                    ? t.requestDetail.describeReasonForReturningThis
                    : modalType === "resolve"
                      ? t.requestDetail.describeHowThisIssueService
                      : t.requestDetail.anyInstructionsForTheNew
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-black/30 text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

          </fieldset>
          {actionError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{actionError}</p>}
        </form>
      </Modal>
    </div>
  );
}
