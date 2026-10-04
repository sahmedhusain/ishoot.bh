"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Inquiry } from "@ishoot/database";
import { Button } from "@ishoot/ui";
import {
  MessageSquare,
  AlertTriangle,
  FileQuestion,
  CheckCircle2,
  RotateCcw,
  ArrowRightLeft,
  UserCheck,
  Filter,
  Search,
  Eye,
  Building,
  User,
  Phone,
  Mail,
  Layers,
  History,
  Check,
  ShieldAlert,
  Plus,
  FileText,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { REQUEST_TEAMS, canTransitionRequest } from "@ishoot/database/constants/requests";
import { RequestTypeBadge, RequestWorkflowBadge } from "./RequestBadges";
import {
assignRequestAction,
reassignRequestAction,
returnRequestAction,
submitRequestForApprovalAction,
confirmRequestAction,
resolveRequestAction,
} from "../../app/actions/requests";

interface UserOption {
  id: string;
  name: string;
  role: string;
  department?: string | null;
}

interface RequestsManagementViewProps {
  initialRequests: Inquiry[];
  users: UserOption[];
  filters: {
    intent?: string;
    team?: string;
    workflowStatus?: string;
    search?: string;
  };
  page: number;
  total: number;
  stats: {
    total: number;
    complaints: number;
    services: number;
    approvals: number;
  };
}


export function RequestsManagementView({
  initialRequests,
  users,
  filters,
  page,
  total,
  stats,
}: RequestsManagementViewProps) {
  const router = useRouter();
  const {t} = useAdminLocale();

  // Filters
  const [typeFilter, setTypeFilter] = React.useState<string>(
    filters.intent || "all",
  );
  const [teamFilter, setTeamFilter] = React.useState<string>(
    filters.team || "all",
  );
  const [statusFilter, setStatusFilter] = React.useState<string>(
    filters.workflowStatus || "all",
  );
  const [searchQuery, setSearchQuery] = React.useState<string>(
    filters.search || "",
  );

  // Modals & Drawers
  const [selectedRequest, setSelectedRequest] = React.useState<Inquiry | null>(
    null,
  );
  const [activeModal, setActiveModal] = React.useState<
    "assign" | "reassign" | "return" | "approve" | "confirm" | "resolve" | null
  >(null);

  // Modal Form Inputs
  const [modalUserId, setModalUserId] = React.useState<string>("");
  const [modalTeam, setModalTeam] = React.useState<string>("production");
  const [modalNotes, setModalNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredRequests = initialRequests;
  const totalCount = stats.total;
  const complaintsCount = stats.complaints;
  const serviceRequestsCount = stats.services;
  const pendingApprovalsCount = stats.approvals;
  const pageUrl = React.useCallback(
    (nextPage: number) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries({
        intent: typeFilter,
        team: teamFilter,
        workflowStatus: statusFilter,
        search: searchQuery,
      }))
        if (value && value !== "all") query.set(key, value);
      query.set("page", String(nextPage));
      return `${ROUTES.requests.list}?${query}`;
    },
    [typeFilter, teamFilter, statusFilter, searchQuery],
  );
  React.useEffect(() => {
    if (
      typeFilter === (filters.intent || "all") &&
      teamFilter === (filters.team || "all") &&
      statusFilter === (filters.workflowStatus || "all") &&
      searchQuery === (filters.search || "")
    )
      return;
    const timer = setTimeout(() => router.replace(pageUrl(1)), 300);
    return () => clearTimeout(timer);
  }, [
    typeFilter,
    teamFilter,
    statusFilter,
    searchQuery,
    filters.intent,
    filters.team,
    filters.workflowStatus,
    filters.search,
    pageUrl,
    router,
  ]);

  const openActionModal = (
    req: Inquiry,
    modalType:
      "assign" | "reassign" | "return" | "approve" | "confirm" | "resolve",
  ) => {
    setSelectedRequest(req);
    setActiveModal(modalType);
    setModalUserId(req.assigned_to_id || users[0]?.id || "");
    setModalTeam(req.team || "production");
    setModalNotes("");
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !activeModal) return;
    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      let res: { success: boolean; error?: string } = { success: false };

      if (activeModal === "assign") {
        res = await assignRequestAction(selectedRequest.id, {
          assignedToId: modalUserId,
          team: modalTeam,
          notes: modalNotes,
        });
      } else if (activeModal === "reassign") {
        res = await reassignRequestAction(selectedRequest.id, {
          newAssignedToId: modalUserId,
          newTeam: modalTeam,
          notes: modalNotes || t.requestsManagement.reassignedToAnotherSpecialist,
        });
      } else if (activeModal === "return") {
        if (!modalNotes.trim()) {
          setActionFeedback({
            type: "error",
            text: t.requestsManagement.returnReasonIsRequired,
          });
          setIsSubmitting(false);
          return;
        }
        res = await returnRequestAction(selectedRequest.id, {
          reason: modalNotes,
        });
      } else if (activeModal === "approve") {
        res = await submitRequestForApprovalAction(selectedRequest.id, {
          notes: modalNotes,
        });
      } else if (activeModal === "confirm") {
        res = await confirmRequestAction(selectedRequest.id, {
          notes: modalNotes,
        });
      } else if (activeModal === "resolve") {
        if (!modalNotes.trim()) {
          setActionFeedback({
            type: "error",
            text: t.requestsManagement.resolutionNotesRequired,
          });
          setIsSubmitting(false);
          return;
        }
        res = await resolveRequestAction(selectedRequest.id, {
          resolutionNotes: modalNotes,
        });
      }

      if (res.success) {
        setActionFeedback({
          type: "success",
          text: t.requestsManagement.workflowActionCompletedSuccessfully,
        });
        setActiveModal(null);
        setSelectedRequest(null);
        router.refresh();
      } else {
        setActionFeedback({
          type: "error",
          text: res.error || t.requestsManagement.actionFailed,
        });
      }
    } catch {
      setActionFeedback({
        type: "error",
        text: t.requestsManagement.anErrorOccurredWhileExecuting,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-3">
            <span>
              {t.requestsManagement.serviceRequestsAndComplaintsSr}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.requestsManagement.unifiedHubForHandlingInquiries}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={ROUTES.requests.create}>
            <Button
              variant="primary"
              size="sm"
              className="bg-[#09937F] hover:bg-[#077a68] text-white gap-2 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t.requestsManagement.newRequestTicket}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium block">
              {t.requestsManagement.totalRequestsSrCr}
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              {totalCount}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Layers className="w-6 h-6 text-[#09937F]" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium block">
              {t.requestsManagement.activeComplaintsCr}
            </span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-display">
              {complaintsCount}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
              {t.requestsManagement.servicesAndQuotesSr}
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-display">
              {serviceRequestsCount}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">
              {t.requestsManagement.assignedAndInApproval}
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-display">
              {pendingApprovalsCount}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Global Action Feedback Alert */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Navigation Bar */}
      <div className="bg-white dark:bg-[#0E1714] p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4 shadow-sm">
        {/* Type Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-white/10 pb-3">
          {[
            { id: "all", label: t.requestsManagement.allRequests, },
            {
              id: "complaint",
              label: t.requestsManagement.complaintsCr,
            },
            {
              id: "service_request",
              label: t.requestsManagement.serviceRequestsSr,
            },
            { id: "quote_request", label: t.requestsManagement.quotes, },
            {
              id: "inquiry",
              label: t.requestsManagement.inquiries,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                typeFilter === tab.id
                  ? "bg-[#09937F] text-white shadow-md shadow-[#09937F]/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls row: Teams, Status, Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Team Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-[#09937F]" />
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#09937F]"
              >
                {(["all", ...REQUEST_TEAMS] as const).map((team) => (
                  <option key={team} value={team}>
                    {t.requestLabels.teams[team]}
                  </option>
                ))}
              </select>
            </div>

            {/* Workflow Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#09937F]"
            >
              <option value="all">
                {t.requestsManagement.allWorkflowStates}
              </option>
              <option value="received">
                {t.requestsManagement.received}
              </option>
              <option value="assigned">
                {t.requestsManagement.assigned2}
              </option>
              <option value="approved">{t.requestsManagement.approved}</option>
              <option value="pending_approval">
                {t.requestsManagement.pendingApproval}
              </option>
              <option value="confirmed">{t.requestsManagement.confirmed2}</option>
              <option value="returned">{t.requestsManagement.returned2}</option>
              <option value="resolved">
                {t.requestsManagement.resolved2}
              </option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                t.requestsManagement.searchByNameEmailTopic
              }
              className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-[#0E1714] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 text-start font-bold">
                  {t.requestsManagement.typeAndSubject}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t.requestsManagement.clientAndEntity}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t.requestsManagement.teamAndAssignee}
                </th>
                <th className="py-3.5 px-4 text-center font-bold">
                  {t.requestsManagement.workflowStage}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t.requestsManagement.date}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t.requestsManagement.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-70" />
                    <span>
                      {t.requestsManagement.noRequestsFoundMatchingFilters}
                    </span>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Type & Subject */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <RequestTypeBadge type={req.type} size="sm" />
                          <span className="font-mono text-[10px] text-slate-400">
                            #{req.id.slice(-6)}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">
                          {req.subject || (t.requestsManagement.noSubject)}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 max-w-sm">
                          {req.message}
                        </p>
                      </div>
                    </td>

                    {/* Client Info */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {req.full_name}
                        </div>
                        {req.company && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{req.company}</span>
                          </div>
                        )}
                        {req.email && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{req.email}</span>
                          </div>
                        )}
                        {req.phone && (
                          <div
                            className="text-[11px] text-slate-500 flex items-center gap-1 font-mono"
                            dir="ltr"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{req.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Team & Assignee */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 capitalize">
                          {req.team || "support"}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
                          <User className="w-3.5 h-3.5 text-[#09937F]" />
                          <span>
                            {req.assigned_to_name ||
                              (t.requestsManagement.unassigned)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Workflow Stage */}
                    <td className="py-4 px-4 align-top text-center">
                      <RequestWorkflowBadge status={req.workflow_status} size="sm" />
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 align-top text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(req.created_at).toISOString().split("T")[0]}
                    </td>

                    {/* Action Controls */}
                    <td className="py-4 px-4 align-top text-end">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link
                          href={ROUTES.requests.detail(req.id)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-[#09937F]/40 text-[#09937F] hover:bg-[#09937F]/10 transition-colors inline-flex items-center gap-1"
                          title={t.requestsManagement.openFullDossier}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{t.requestsManagement.dossier}</span>
                        </Link>

                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1"
                          title={t.requestsManagement.quickPreview}
                        >
                          <Eye className="w-3 h-3" />
                          <span>{t.requestsManagement.preview}</span>
                        </button>

                        <button
                          onClick={() => openActionModal(req, "reassign")}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors inline-flex items-center gap-1"
                          title={t.requestsManagement.reassignTeamOrPerson}
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>
                            {t.requestsManagement.reassign}
                          </span>
                        </button>

                        {canTransitionRequest(req.workflow_status, "submit") && (
                          <button
                            onClick={() => openActionModal(req, "approve")}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#09937F] hover:bg-[#077a68] text-white transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{t.requestWorkflow.submitForApproval}</span>
                          </button>
                        )}

                        {req.workflow_status === "approved" && (
                          <button
                            onClick={() => openActionModal(req, "confirm")}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors inline-flex items-center gap-1 shadow-sm"
                            title={t.requestsManagement.executiveConfirmation}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{t.requestsManagement.confirm}</span>
                          </button>
                        )}

                        {req.workflow_status !== "returned" &&
                          req.workflow_status !== "resolved" && (
                            <button
                              onClick={() => openActionModal(req, "return")}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors inline-flex items-center gap-1"
                              title={t.requestsManagement.returnBackWithReason}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{t.requestsManagement.return}</span>
                            </button>
                          )}

                        {req.workflow_status !== "resolved" && (
                          <button
                            onClick={() => openActionModal(req, "resolve")}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors inline-flex items-center gap-1"
                            title={t.requestsManagement.markAsResolved}
                          >
                            <Check className="w-3 h-3" />
                            <span>{t.requestsManagement.resolve}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer (Right Side on LTR, Left on RTL) */}
      {selectedRequest && !activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end p-0">
          <div className="bg-white dark:bg-[#0E1714] border-l rtl:border-r rtl:border-l-0 border-slate-200 dark:border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#0E1714]/95 backdrop-blur z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RequestTypeBadge type={selectedRequest.type} size="sm" />
                  <span className="font-mono text-xs text-slate-400">
                    #{selectedRequest.id.slice(-6)}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {selectedRequest.subject ||
                    (t.requestsManagement.requestDetails)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Client Info */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#09937F]">
                  {t.requestsManagement.clientInformation}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">
                      {t.requestsManagement.name}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.full_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      {t.requestsManagement.company}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.company || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      {t.requestsManagement.email}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {selectedRequest.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      {t.requestsManagement.phone}
                    </span>
                    <span
                      className="font-semibold text-slate-800 dark:text-slate-200 font-mono"
                      dir="ltr"
                    >
                      {selectedRequest.phone || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t.requestsManagement.requestComplaintMessage}
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedRequest.message}
                </div>
              </div>

              {/* Current Assignment & Stage */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t.requestsManagement.currentAssignmentAndWorkflow}
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {t.requestsManagement.assignedTeam}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {selectedRequest.team || "support"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {t.requestsManagement.assignedUser}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.assigned_to_name || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {t.requestsManagement.workflowStage2}
                    </span>
                    <div>
                      <RequestWorkflowBadge status={selectedRequest.workflow_status} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Assignment & Routing Audit Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#09937F]" />
                  <span>
                    {t.requestsManagement.assignmentAndWorkflowAuditHistory}
                  </span>
                </h4>
                {selectedRequest.custom_assignments &&
                selectedRequest.custom_assignments.length > 0 ? (
                  <div className="space-y-3 pl-3 rtl:pr-3 rtl:pl-0 border-l-2 rtl:border-r-2 rtl:border-l-0 border-slate-200 dark:border-white/10">
                    {selectedRequest.custom_assignments.map(
                      (item: any, i: number) => (
                        <div key={i} className="relative space-y-1 text-xs">
                          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            <span className="w-2 h-2 rounded-full bg-[#09937F] absolute -left-[17px] rtl:-right-[17px] top-1.5" />
                            <span className="capitalize">
                              {item.action || "Update"}
                            </span>
                            <span className="text-slate-400 font-normal text-[11px]">
                              by {item.assignedByName || "System"}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                              {item.notes}
                            </p>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {item.timestamp
                              ? new Date(item.timestamp).toLocaleString()
                              : ""}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200/60 text-center">
                    {t.requestsManagement.noPreviousAssignmentEntries}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#070C0A] flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openActionModal(selectedRequest, "reassign")}
                className="gap-1 text-blue-600"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{t.requestsManagement.reassign2}</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => openActionModal(selectedRequest, "resolve")}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t.requestsManagement.resolve}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal with Detailed Changed Diff */}
      {activeModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1714] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#09937F]" />
                  <span>
                    {activeModal === "assign" &&
                      (t.requestsManagement.assignRequestToTeam)}
                    {activeModal === "reassign" &&
                      (t.requestsManagement.reassignAndRouteRequest)}
                    {activeModal === "return" &&
                      (t.requestsManagement.returnRequestWithReason)}
                    {activeModal === "approve" &&
                      (t.requestsManagement.approveRequestWorkflow)}
                    {activeModal === "confirm" &&
                      (t.requestsManagement.finalExecutiveConfirmation)}
                    {activeModal === "resolve" &&
                      (t.requestsManagement.resolveAndCloseRequest)}
                  </span>
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedRequest.subject ||
                    "SR/CR #" + selectedRequest.id.slice(-6)}
                </span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Visual Diff Box: What is the Changed */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.requestsManagement.changesToBeAppliedDiff}
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Previous State */}
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 text-rose-900 dark:text-rose-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-500 block">
                    {t.requestsManagement.beforeChange}
                  </span>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {t.requestsManagement.currentAssignee}
                    </span>
                    <strong className="font-semibold">
                      {selectedRequest.assigned_to_name || "Unassigned"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {t.requestsManagement.currentTeam}
                    </span>
                    <strong className="font-semibold capitalize">
                      {selectedRequest.team || "support"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {t.requestsManagement.workflowStage3}
                    </span>
                    <strong className="font-semibold">
                      {selectedRequest.workflow_status || "received"}
                    </strong>
                  </div>
                </div>

                {/* Target State */}
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 text-emerald-900 dark:text-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                    {t.requestsManagement.afterChange}
                  </span>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {t.requestsManagement.newAssignee}
                    </span>
                    <strong className="font-semibold">
                      {activeModal === "reassign" || activeModal === "assign"
                        ? users.find((u) => u.id === modalUserId)?.name ||
                          t.requestsManagement.selectedLead
                        : selectedRequest.assigned_to_name || "Same"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {t.requestsManagement.newTeam}
                    </span>
                    <strong className="font-semibold capitalize">
                      {activeModal === "reassign" || activeModal === "assign"
                        ? modalTeam
                        : selectedRequest.team}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {t.requestsManagement.newStage}
                    </span>
                    <strong className="font-semibold">
                      {activeModal === "assign" && "assigned"}
                      {activeModal === "reassign" && "assigned"}
                      {activeModal === "return" && "returned"}
                      {activeModal === "approve" && "approved"}
                      {activeModal === "confirm" && "confirmed"}
                      {activeModal === "resolve" && "resolved"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields depending on Modal Action */}
            <form onSubmit={handleExecuteAction} className="space-y-4">
              {(activeModal === "assign" || activeModal === "reassign") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.requestsManagement.selectTeam}
                    </label>
                    <select
                      value={modalTeam}
                      onChange={(e) => setModalTeam(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                    >
                      {REQUEST_TEAMS.map((team) => (
                        <option key={team} value={team}>
                          {t.requestLabels.teams[team]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.requestsManagement.assigneePerson}
                    </label>
                    <select
                      value={modalUserId}
                      onChange={(e) => setModalUserId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {activeModal === "return"
                    ? t.requestsManagement.reasonForReturnRequired
                    : activeModal === "resolve"
                      ? t.requestsManagement.resolutionSummaryAndOutput
                      : t.requestsManagement.actionNotesAndDirectivesOptional}
                </label>
                <textarea
                  rows={3}
                  required={
                    activeModal === "return" || activeModal === "resolve"
                  }
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder={
                    activeModal === "return"
                      ? t.requestsManagement.describeWhyThisRequestIs
                      : activeModal === "resolve"
                        ? t.requestsManagement.describeHowThisIssueService
                        : t.requestsManagement.addAnyInstructionsOrRemarks
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModal(null)}
                  disabled={isSubmitting}
                >
                  {t.requestsManagement.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className={
                    activeModal === "return"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : activeModal === "confirm"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-[#09937F] hover:bg-[#077a68] text-white"
                  }
                >
                  {isSubmitting
                    ? t.requestsManagement.applying
                    : t.requestsManagement.confirmAndApply}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 py-4">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => router.push(pageUrl(page - 1))}
        >
          {t.requestsManagement.previous}
        </Button>
        <span>
          {t.requestsManagement.page} {page} /{" "}
          {Math.max(1, Math.ceil(total / 50))} · {total}{" "}
          {t.requestsManagement.results}
        </span>
        <Button
          variant="outline"
          disabled={page * 50 >= total}
          onClick={() => router.push(pageUrl(page + 1))}
        >
          {t.requestsManagement.next}
        </Button>
      </div>
    </div>
  );
}
