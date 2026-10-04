"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Inquiry } from "@ishoot/database";
import { Button,StatusBadge } from "@ishoot/ui";
import {
MessageSquare,
AlertTriangle,
FileQuestion,
HelpCircle,
Clock,
CheckCircle2,
RotateCcw,
ArrowRightLeft,
UserCheck,Filter,
Search,
Eye,
Building,
User,
Phone,
Mail,Layers,
History,
Check,ShieldAlert
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
assignRequestAction,
reassignRequestAction,
returnRequestAction,
approveRequestAction,
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

const TEAMS = [
  { id: "all", labelEn: "All Teams", labelAr: "كل الفرق" },
  { id: "production", labelEn: "Production", labelAr: "فريق الإنتاج" },
  {
    id: "post_production",
    labelEn: "Post-Production",
    labelAr: "ما بعد الإنتاج / المونتاج",
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

export function RequestsManagementView({
  initialRequests,
  users,
  filters,
  page,
  total,
  stats,
}: RequestsManagementViewProps) {
  const router = useRouter();
  const { isRTL } = useAdminLocale();

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
      return `/dashboard/requests?${query}`;
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
          notes: modalNotes || "Reassigned to another specialist",
        });
      } else if (activeModal === "return") {
        if (!modalNotes.trim()) {
          setActionFeedback({
            type: "error",
            text: isRTL ? "يرجى ذكر سبب الإرجاع" : "Return reason is required",
          });
          setIsSubmitting(false);
          return;
        }
        res = await returnRequestAction(selectedRequest.id, {
          reason: modalNotes,
        });
      } else if (activeModal === "approve") {
        res = await approveRequestAction(selectedRequest.id, {
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
            text: isRTL
              ? "يرجى كتابة ملخص الحل والتسليم"
              : "Resolution notes required",
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
          text: isRTL
            ? "تم تحديث الطلب وتطبيق التغييرات بنجاح"
            : "Workflow action completed successfully",
        });
        setActiveModal(null);
        setSelectedRequest(null);
        router.refresh();
      } else {
        setActionFeedback({
          type: "error",
          text: res.error || "Action failed",
        });
      }
    } catch {
      setActionFeedback({
        type: "error",
        text: "An error occurred while executing the workflow action",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWorkflowBadge = (status?: string | null) => {
    const s = status || "received";
    switch (s) {
      case "received":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{isRTL ? "مستلم جديد" : "Received"}</span>
          </span>
        );
      case "assigned":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50">
            <UserCheck className="w-3 h-3 text-blue-500" />
            <span>{isRTL ? "مُعيّن ومُتابع" : "Assigned"}</span>
          </span>
        );
      case "approved":
        return (
          <span className="text-emerald-600">
            {isRTL ? "معتمد" : "Approved"}
          </span>
        );
      case "pending_approval":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>{isRTL ? "بانتظار الاعتماد" : "Pending Approval"}</span>
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50">
            <CheckCircle2 className="w-3 h-3 text-purple-500" />
            <span>{isRTL ? "مؤكّد ومعتمد" : "Confirmed"}</span>
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50">
            <RotateCcw className="w-3 h-3 text-rose-500" />
            <span>{isRTL ? "مُعاد للدراسة" : "Returned"}</span>
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
            <Check className="w-3 h-3 text-emerald-500" />
            <span>{isRTL ? "مكتمل ومغلق" : "Resolved"}</span>
          </span>
        );
      default:
        return <StatusBadge status={s} />;
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type || "inquiry") {
      case "complaint":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>{isRTL ? "شكوى عميل" : "Complaint"}</span>
          </span>
        );
      case "service_request":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
            <Layers className="w-3 h-3 text-emerald-600" />
            <span>{isRTL ? "طلب خدمة إنتاج" : "Service Request"}</span>
          </span>
        );
      case "quote_request":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
            <FileQuestion className="w-3 h-3 text-amber-600" />
            <span>{isRTL ? "طلب عرض سعر" : "Quote Request"}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300/40">
            <HelpCircle className="w-3 h-3 text-sky-600" />
            <span>{isRTL ? "استفسار عام" : "Inquiry"}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display flex items-center gap-3">
            <span>
              {isRTL
                ? "إدارة الطلبات والشكاوى (SR / CR)"
                : "Service Requests & Complaints (SR / CR)"}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRTL
              ? "نظام موحد لاستقبال وتوزيع طلبات الخدمات، الشكاوى، واعتمادات فرق العمل بمصفوفة تفويض وتأكيد"
              : "Unified hub for handling inquiries, complaints, team assignments, custom routing, and approval workflows"}
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium block">
              {isRTL ? "إجمالي الطلبات والشكاوى" : "Total Requests (SR/CR)"}
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
              {isRTL ? "شكاوى العملاء النشطة" : "Active Complaints (CR)"}
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
              {isRTL ? "طلبات الخدمات والأسعار" : "Services & Quotes (SR)"}
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
              {isRTL ? "قيد المتابعة والاعتماد" : "Assigned & In Approval"}
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
            { id: "all", labelEn: "All Requests", labelAr: "كافة الطلبات" },
            {
              id: "complaint",
              labelEn: "Complaints (CR)",
              labelAr: "الشكاوى (CR)",
            },
            {
              id: "service_request",
              labelEn: "Service Requests (SR)",
              labelAr: "طلبات الخدمات (SR)",
            },
            { id: "quote_request", labelEn: "Quotes", labelAr: "عروض الأسعار" },
            {
              id: "inquiry",
              labelEn: "Inquiries",
              labelAr: "الاستفسارات العامة",
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
              {isRTL ? tab.labelAr : tab.labelEn}
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
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {isRTL ? t.labelAr : t.labelEn}
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
                {isRTL ? "جميع حالات سير العمل" : "All Workflow States"}
              </option>
              <option value="received">
                {isRTL ? "مستلم جديد" : "Received"}
              </option>
              <option value="assigned">
                {isRTL ? "مُعين للمتابعة" : "Assigned"}
              </option>
              <option value="approved">{isRTL ? "معتمد" : "Approved"}</option>
              <option value="pending_approval">
                {isRTL ? "بانتظار الاعتماد" : "Pending Approval"}
              </option>
              <option value="confirmed">{isRTL ? "مؤكد" : "Confirmed"}</option>
              <option value="returned">{isRTL ? "مُعاد" : "Returned"}</option>
              <option value="resolved">
                {isRTL ? "محلول ومغلق" : "Resolved"}
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
                isRTL
                  ? "بحث بالاسم، البريد، الشركة..."
                  : "Search by name, email, topic..."
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
                  {isRTL ? "النوع والموضوع" : "Type & Subject"}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {isRTL ? "بيانات العميل" : "Client & Entity"}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {isRTL ? "الفريق والمسؤول" : "Team & Assignee"}
                </th>
                <th className="py-3.5 px-4 text-center font-bold">
                  {isRTL ? "مرحلة العمل" : "Workflow Stage"}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {isRTL ? "التاريخ" : "Date"}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {isRTL ? "الإجراءات المعتمدة" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-70" />
                    <span>
                      {isRTL
                        ? "لا توجد طلبات أو شكاوى مطابقة لمعايير البحث"
                        : "No requests found matching filters"}
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
                          {getTypeBadge(req.type)}
                          <span className="font-mono text-[10px] text-slate-400">
                            #{req.id.slice(-6)}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">
                          {req.subject || (isRTL ? "بدون عنوان" : "No Subject")}
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
                              (isRTL ? "غير مُعيّن" : "Unassigned")}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Workflow Stage */}
                    <td className="py-4 px-4 align-top text-center">
                      {getWorkflowBadge(req.workflow_status)}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 align-top text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(req.created_at).toISOString().split("T")[0]}
                    </td>

                    {/* Action Controls */}
                    <td className="py-4 px-4 align-top text-end">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1"
                          title="View Details & Audit Trail"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isRTL ? "التفاصيل" : "Details"}</span>
                        </button>

                        <button
                          onClick={() => openActionModal(req, "reassign")}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors inline-flex items-center gap-1"
                          title="Reassign Team or Person"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>
                            {isRTL ? "تحويل / إعادة تعيين" : "Reassign"}
                          </span>
                        </button>

                        {["assigned", "pending_approval"].includes(
                          req.workflow_status || "",
                        ) && (
                          <button
                            onClick={() => openActionModal(req, "approve")}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#09937F] hover:bg-[#077a68] text-white transition-colors inline-flex items-center gap-1 shadow-sm"
                            title="Approve / Progress"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isRTL ? "اعتماد" : "Approve"}</span>
                          </button>
                        )}

                        {req.workflow_status === "approved" && (
                          <button
                            onClick={() => openActionModal(req, "confirm")}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors inline-flex items-center gap-1 shadow-sm"
                            title="Executive Confirmation"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{isRTL ? "تأكيد تنفيذي" : "Confirm"}</span>
                          </button>
                        )}

                        {req.workflow_status !== "returned" &&
                          req.workflow_status !== "resolved" && (
                            <button
                              onClick={() => openActionModal(req, "return")}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors inline-flex items-center gap-1"
                              title="Return Back with Reason"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{isRTL ? "إرجاع" : "Return"}</span>
                            </button>
                          )}

                        {req.workflow_status !== "resolved" && (
                          <button
                            onClick={() => openActionModal(req, "resolve")}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors inline-flex items-center gap-1"
                            title="Mark as Resolved"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isRTL ? "حل وإغلاق" : "Resolve"}</span>
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
                  {getTypeBadge(selectedRequest.type)}
                  <span className="font-mono text-xs text-slate-400">
                    #{selectedRequest.id.slice(-6)}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {selectedRequest.subject ||
                    (isRTL ? "تفاصيل الطلب" : "Request Details")}
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
                  {isRTL ? "بيانات العميل والتواصل" : "Client Information"}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">
                      {isRTL ? "الاسم الكامل" : "Name"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.full_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      {isRTL ? "الشركة" : "Company"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.company || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      {isRTL ? "البريد الإلكتروني" : "Email"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {selectedRequest.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      {isRTL ? "رقم الهاتف" : "Phone"}
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
                  {isRTL
                    ? "نص الشكوى أو متطلبات الخدمة"
                    : "Request / Complaint Message"}
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedRequest.message}
                </div>
              </div>

              {/* Current Assignment & Stage */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {isRTL
                    ? "المسؤولية الإدارية الحالية"
                    : "Current Assignment & Workflow"}
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {isRTL ? "الفريق المختص" : "Assigned Team"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {selectedRequest.team || "support"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {isRTL ? "المسؤول المباشر" : "Assigned User"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedRequest.assigned_to_name || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {isRTL ? "حالة السير" : "Workflow Stage"}
                    </span>
                    <div>
                      {getWorkflowBadge(selectedRequest.workflow_status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Assignment & Routing Audit Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#09937F]" />
                  <span>
                    {isRTL
                      ? "سجل التحويلات والاعتمادات المخصصة"
                      : "Assignment & Workflow Audit History"}
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
                    {isRTL
                      ? "لا توجد تحويلات سابقة مسجلة"
                      : "No previous assignment entries"}
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
                <span>{isRTL ? "إعادة تعيين / تحويل" : "Reassign"}</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => openActionModal(selectedRequest, "resolve")}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isRTL ? "حل وإغلاق" : "Resolve"}</span>
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
                      (isRTL
                        ? "تعيين الطلب إلى فريق ومسؤول"
                        : "Assign Request to Team")}
                    {activeModal === "reassign" &&
                      (isRTL
                        ? "إعادة توجيه وتحويل الطلب (Re-assign)"
                        : "Reassign & Route Request")}
                    {activeModal === "return" &&
                      (isRTL
                        ? "إرجاع الطلب مع السبب (Return Back)"
                        : "Return Request with Reason")}
                    {activeModal === "approve" &&
                      (isRTL
                        ? "اعتماد الطلب والموافقة على المتابعة"
                        : "Approve Request Workflow")}
                    {activeModal === "confirm" &&
                      (isRTL
                        ? "تأكيد إداري نهائي للتنفيذ (Confirm)"
                        : "Final Executive Confirmation")}
                    {activeModal === "resolve" &&
                      (isRTL
                        ? "حل وإغلاق الطلب رسمياً (Resolve)"
                        : "Resolve & Close Request")}
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
                {isRTL
                  ? "تأكيد الفروقات والتغييرات (Diff Verification)"
                  : "Changes to be Applied (Diff)"}
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Previous State */}
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 text-rose-900 dark:text-rose-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-500 block">
                    {isRTL ? "الحالة السابقة" : "Before Change"}
                  </span>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {isRTL ? "المسؤول الحالي:" : "Current Assignee:"}
                    </span>
                    <strong className="font-semibold">
                      {selectedRequest.assigned_to_name || "Unassigned"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {isRTL ? "الفريق الحالي:" : "Current Team:"}
                    </span>
                    <strong className="font-semibold capitalize">
                      {selectedRequest.team || "support"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {isRTL ? "مرحلة السير:" : "Workflow Stage:"}
                    </span>
                    <strong className="font-semibold">
                      {selectedRequest.workflow_status || "received"}
                    </strong>
                  </div>
                </div>

                {/* Target State */}
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 text-emerald-900 dark:text-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                    {isRTL ? "الحالة الجديدة بعد التأكيد" : "After Change"}
                  </span>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {isRTL ? "المسؤول الجديد:" : "New Assignee:"}
                    </span>
                    <strong className="font-semibold">
                      {activeModal === "reassign" || activeModal === "assign"
                        ? users.find((u) => u.id === modalUserId)?.name ||
                          "Selected Lead"
                        : selectedRequest.assigned_to_name || "Same"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {isRTL ? "الفريق الجديد:" : "New Team:"}
                    </span>
                    <strong className="font-semibold capitalize">
                      {activeModal === "reassign" || activeModal === "assign"
                        ? modalTeam
                        : selectedRequest.team}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] opacity-70 block">
                      {isRTL ? "مرحلة السير القادمة:" : "New Stage:"}
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
                      {isRTL ? "اختر الفريق" : "Select Team"}
                    </label>
                    <select
                      value={modalTeam}
                      onChange={(e) => setModalTeam(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                    >
                      {TEAMS.filter((t) => t.id !== "all").map((t) => (
                        <option key={t.id} value={t.id}>
                          {isRTL ? t.labelAr : t.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isRTL ? "اختر الموظف / المسؤول" : "Assignee Person"}
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
                    ? isRTL
                      ? "سبب الإرجاع وملاحظات التصحيح *"
                      : "Reason for Return (Required) *"
                    : activeModal === "resolve"
                      ? isRTL
                        ? "ملخص الحل وتقرير الإنجاز *"
                        : "Resolution Summary & Output *"
                      : isRTL
                        ? "ملاحظات توجيهية إضافية (اختياري)"
                        : "Action Notes & Directives (Optional)"}
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
                      ? isRTL
                        ? "اكتب سبب إرجاع الطلب والنواقص التي تحتاج لاستكمال..."
                        : "Describe why this request is returned and what is missing..."
                      : activeModal === "resolve"
                        ? isRTL
                          ? "اكتب كيف تم حل الشكوى أو تسليم متطلبات الخدمة بنجاح..."
                          : "Describe how this issue/service was successfully resolved..."
                        : isRTL
                          ? "أضف أي ملاحظات أو تعليمات خاصة للمسؤول..."
                          : "Add any instructions or remarks for this action..."
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
                  {isRTL ? "إلغاء التراجع" : "Cancel"}
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
                    ? isRTL
                      ? "جارٍ التنفيذ والتسجيل..."
                      : "Applying..."
                    : isRTL
                      ? "تأكيد التغيير والتنفيذ"
                      : "Confirm & Apply"}
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
          {isRTL ? "السابق" : "Previous"}
        </Button>
        <span>
          {isRTL ? "الصفحة" : "Page"} {page} /{" "}
          {Math.max(1, Math.ceil(total / 50))} · {total}{" "}
          {isRTL ? "نتيجة" : "results"}
        </span>
        <Button
          variant="outline"
          disabled={page * 50 >= total}
          onClick={() => router.push(pageUrl(page + 1))}
        >
          {isRTL ? "التالي" : "Next"}
        </Button>
      </div>
    </div>
  );
}
