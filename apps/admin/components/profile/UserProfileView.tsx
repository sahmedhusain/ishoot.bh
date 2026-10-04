"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  FileSignature,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Send,
  Users,
  Check,
  X,
  FileText,
} from "lucide-react";
import { Button, Card, StatusBadge } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  updateMyProfileAction,
  requestIdentityChangeAction,
  decideProfileChangeAction,
} from "../../app/actions/profile";
import type { Profile, ProfileChangeRequest } from "@ishoot/database";

interface ManagerInfo {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface UserProfileViewProps {
  user: Profile;
  manager: ManagerInfo | null;
  employeeRecord: any | null;
  myRequests: ProfileChangeRequest[];
  pendingTeamRequests: ProfileChangeRequest[];
}

export function UserProfileView({
  user,
  manager,
  employeeRecord,
  myRequests,
  pendingTeamRequests,
}: UserProfileViewProps) {
  const router = useRouter();
  const { isRTL, t } = useAdminLocale();

  // Contact Form (Immediate Update)
  const [phone, setPhone] = React.useState(user.phone || "");
  const [signatureUrl, setSignatureUrl] = React.useState(
    user.signature_url || "",
  );
  const [isUpdatingContact, setIsUpdatingContact] = React.useState(false);

  // Identity Change Request Form (Manager Approved)
  const [proposedFullName, setProposedFullName] = React.useState("");
  const [proposedEmail, setProposedEmail] = React.useState("");
  const [changeReason, setChangeReason] = React.useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = React.useState(false);

  // Manager Decision state
  const [decidingId, setDecidingId] = React.useState<string | null>(null);
  const [rejectModalReqId, setRejectModalReqId] = React.useState<string | null>(
    null,
  );
  const [rejectReason, setRejectReason] = React.useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = React.useState(false);

  // Handle Immediate Contact Update
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContact(true);
    const toastId = toast.loading(t.hrText.text186);

    try {
      const res = await updateMyProfileAction({
        phone: phone.trim() || undefined,
        signature_url: signatureUrl.trim() || undefined,
      });

      if (res.success) {
        toast.success(t.hrText.text187, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.hrText.text188, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred", { id: toastId });
    } finally {
      setIsUpdatingContact(false);
    }
  };

  // Handle Identity Change Request
  const handleSubmitIdentityChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proposedFullName.trim() && !proposedEmail.trim()) {
      toast.error(t.hrText.text189);
      return;
    }

    setIsSubmittingRequest(true);
    const toastId = toast.loading(t.hrText.text190);

    try {
      const res = await requestIdentityChangeAction({
        fullName: proposedFullName.trim() || undefined,
        email: proposedEmail.trim() || undefined,
        reason: changeReason.trim() || undefined,
      });

      if (res.success) {
        toast.success(t.hrText.text191, { id: toastId });
        setProposedFullName("");
        setProposedEmail("");
        setChangeReason("");
        router.refresh();
      } else {
        toast.error(t.hrText.text192, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit change request", {
        id: toastId,
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Handle Manager Decision
  const handleDecide = async (
    requestId: string,
    decision: "approved" | "rejected",
    notes?: string,
  ) => {
    setDecidingId(requestId);
    setIsSubmittingDecision(true);
    const toastId = toast.loading(
      decision === "approved" ? t.hrText.text193 : t.hrText.text194,
    );

    try {
      const res = await decideProfileChangeAction(requestId, decision, notes);
      if (res.success) {
        toast.success(
          decision === "approved" ? t.hrText.text195 : t.hrText.text196,
          { id: toastId },
        );
        setRejectModalReqId(null);
        setRejectReason("");
        router.refresh();
      } else {
        toast.error(t.hrText.text197, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply decision", { id: toastId });
    } finally {
      setDecidingId(null);
      setIsSubmittingDecision(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>{t.hrText.text198}</span>
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{t.hrText.text199}</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50">
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>{t.hrText.text200}</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400">
            <span>{t.hrText.text201}</span>
          </span>
        );
      default:
        return <StatusBadge status={status} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* Profile Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#09937F]/10 border border-[#09937F]/20 text-[#09937F] font-bold text-2xl flex items-center justify-center font-display">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {user.full_name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {user.role.replace("_", " ")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Mail className="w-3.5 h-3.5" />
                <span>{user.email}</span>
              </span>
              {user.phone && (
                <span className="flex items-center gap-1 font-mono" dir="ltr">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{user.phone}</span>
                </span>
              )}
              {user.department && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>{user.department}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-end">
            <span className="text-[11px] text-slate-400 block">
              {t.hrText.text202}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t.hrText.text203}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pending Team Requests for Manager (Maker-Checker Review Queue) */}
      {pendingTeamRequests.length > 0 && (
        <Card className="p-6 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.hrText.text204}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.hrText.text205}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingTeamRequests.map((req: any) => {
              const oldVals = req.oldValues || {};
              const newVals = req.newValues || {};
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#0E1714] border border-amber-200 dark:border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-[#09937F]" />
                      <span>{req.user?.fullName || "Employee"}</span>
                      <span className="text-slate-400 font-normal">
                        ({req.user?.email})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Diff Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {newVals.fullName && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/60 dark:border-white/5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {t.hrText.text206}
                        </span>
                        <div className="line-through text-slate-400 text-xs">
                          {oldVals.fullName}
                        </div>
                        <div className="font-bold text-emerald-600 text-xs flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                          <span>{newVals.fullName}</span>
                        </div>
                      </div>
                    )}

                    {newVals.email && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/60 dark:border-white/5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {t.hrText.text207}
                        </span>
                        <div className="line-through text-slate-400 text-xs font-mono">
                          {oldVals.email}
                        </div>
                        <div className="font-bold text-emerald-600 text-xs font-mono flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                          <span>{newVals.email}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectModalReqId(req.id)}
                      disabled={isSubmittingDecision}
                      className="gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <X className="w-3 h-3" />
                      <span>{t.hrText.text98}</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDecide(req.id, "approved")}
                      disabled={isSubmittingDecision}
                      className="gap-1 text-xs bg-[#09937F] hover:bg-[#077a68] text-white"
                    >
                      <Check className="w-3 h-3" />
                      <span>
                        {decidingId === req.id
                          ? t.hrText.text208
                          : t.hrText.text209}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Grid: Contact Updates (Immediate) & Governance Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Self-Service Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Immediate Contact & Signature Update */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <Phone className="w-4 h-4 text-[#09937F]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.hrText.text210}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.hrText.text211}
            </p>

            <form onSubmit={handleUpdateContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.hrText.text131}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+973 39000000"
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F] font-mono text-start"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.hrText.text212}
                </label>
                <div className="relative">
                  <FileSignature className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                  <input
                    type="text"
                    value={signatureUrl}
                    onChange={(e) => setSignatureUrl(e.target.value)}
                    placeholder={t.hrText.text213}
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F] font-mono text-start"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {t.hrText.text214}
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUpdatingContact}
                  className="bg-[#09937F] hover:bg-[#077a68] text-white text-xs font-semibold"
                >
                  {isUpdatingContact ? t.hrText.text215 : t.hrText.text216}
                </Button>
              </div>
            </form>
          </div>

          {/* Section 2: Identity Change Request (Manager Approved) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <ShieldCheck className="w-4 h-4 text-[#09937F]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.hrText.text217}
              </h2>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                {t.hrText.text218}
              </span>
              <p className="leading-relaxed">{t.hrText.text219}</p>
            </div>

            <form onSubmit={handleSubmitIdentityChange} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.hrText.text220}
                  </label>
                  <input
                    type="text"
                    value={proposedFullName}
                    onChange={(e) => setProposedFullName(e.target.value)}
                    placeholder={user.full_name}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {t.hrText.text221}
                    {user.full_name}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.hrText.text222}
                  </label>
                  <input
                    type="email"
                    value={proposedEmail}
                    onChange={(e) => setProposedEmail(e.target.value)}
                    placeholder={user.email}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F] font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    {t.hrText.text221}
                    {user.email}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.hrText.text223}
                </label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder={t.hrText.text224}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={
                    isSubmittingRequest ||
                    (!proposedFullName.trim() && !proposedEmail.trim())
                  }
                  className="bg-[#09937F] hover:bg-[#077a68] text-white text-xs font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingRequest ? t.hrText.text225 : t.hrText.text226}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Section 3: My Change Requests History */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#09937F]" />
              <span>{t.hrText.text227}</span>
            </h2>

            {myRequests.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {myRequests.map((req: any) => {
                  const newVals = req.newValues || {};
                  return (
                    <div
                      key={req.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(req.status)}
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">
                          {newVals.fullName && (
                            <span>
                              {t.hrText.text228}
                              <strong>{newVals.fullName}</strong>{" "}
                            </span>
                          )}
                          {newVals.email && (
                            <span className="font-mono">
                              {t.hrText.text229}
                              <strong>{newVals.email}</strong>
                            </span>
                          )}
                        </div>
                        {req.reviewNotes && (
                          <p className="text-[11px] text-slate-400 italic">
                            {t.hrText.text230}
                            {req.reviewNotes}
                            {t.hrText.text231}
                          </p>
                        )}
                      </div>
                      <div className="text-end text-[11px] text-slate-400">
                        {req.reviewedAt
                          ? `${t.hrText.text232}${new Date(req.reviewedAt).toLocaleDateString()}`
                          : t.hrText.text233}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                {t.hrText.text234}
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Reporting Line & Employee Profile */}
        <div className="space-y-6">
          {/* Manager Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F] flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t.hrText.text235}</span>
            </h3>

            {manager ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.hrText.text236}
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {manager.fullName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.hrText.text16}
                  </span>
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    {manager.email}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.hrText.text237}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold capitalize mt-0.5 inline-block">
                    {manager.role.replace("_", " ")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 text-xs text-slate-500">
                {t.hrText.text238}
              </div>
            )}
          </div>

          {/* Linked Employee Record Card */}
          {employeeRecord && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#09937F] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{t.hrText.text239}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.hrText.text240}
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {isRTL
                      ? employeeRecord.jobTitleAr || employeeRecord.jobTitleEn
                      : employeeRecord.jobTitleEn}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.hrText.text9}
                  </span>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {employeeRecord.department?.nameEn ||
                      employeeRecord.departmentName ||
                      "—"}
                  </div>
                </div>

                {employeeRecord.cprNumber && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {t.hrText.text241}
                    </span>
                    <div className="font-mono text-slate-700 dark:text-slate-300">
                      •••• •••• {employeeRecord.cprNumber.slice(-3)}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.hrText.text139}
                  </span>
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(employeeRecord.hireDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalReqId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1714] border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t.hrText.text242}
            </h3>

            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t.hrText.text243}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalReqId(null)}
                disabled={isSubmittingDecision}
              >
                {t.hrText.text23}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmittingDecision || !rejectReason.trim()}
                onClick={() =>
                  handleDecide(rejectModalReqId, "rejected", rejectReason)
                }
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmittingDecision ? t.hrText.text244 : t.hrText.text112}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
