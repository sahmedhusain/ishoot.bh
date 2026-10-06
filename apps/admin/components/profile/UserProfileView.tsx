"use client";
import { errorMessage } from "../../lib/error-text";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
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
import { Button, Card, StatusBadge, useDialog, formatDate } from "@ishoot/ui";
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
  const { isRTL, t, locale } = useAdminLocale();

  // Contact Form (Immediate Update)
  const [phone, setPhone] = React.useState(user.phone || "");
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
  const rejectDialog = useDialog(!!rejectModalReqId, () => setRejectModalReqId(null));
  const [rejectReason, setRejectReason] = React.useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = React.useState(false);

  // Handle Immediate Contact Update
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContact(true);
    const toastId = toast.loading(t.userProfile.updatingContactDetails);

    try {
      const res = await updateMyProfileAction({
        phone: phone.trim() || undefined,
      });

      if (res.success) {
        toast.success(t.userProfile.contactDetailsUpdatedSuccessfully, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.userProfile.failedToUpdateProfile, { id: toastId });
      }
    } catch (err: any) {
      toast.error(errorMessage(err, t, t.userProfile.anErrorOccurred), { id: toastId });
    } finally {
      setIsUpdatingContact(false);
    }
  };

  // Handle Identity Change Request
  const handleSubmitIdentityChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proposedFullName.trim() && !proposedEmail.trim()) {
      toast.error(t.userProfile.pleaseSpecifyEitherANew);
      return;
    }

    setIsSubmittingRequest(true);
    const toastId = toast.loading(t.userProfile.submittingIdentityChangeRequest);

    try {
      const res = await requestIdentityChangeAction({
        fullName: proposedFullName.trim() || undefined,
        email: proposedEmail.trim() || undefined,
        reason: changeReason.trim() || undefined,
      });

      if (res.success) {
        toast.success(t.userProfile.requestSubmittedSuccessfullyForManager, { id: toastId });
        setProposedFullName("");
        setProposedEmail("");
        setChangeReason("");
        router.refresh();
      } else {
        toast.error(t.userProfile.failedToSubmitChangeRequest, { id: toastId });
      }
    } catch (err: any) {
      toast.error(errorMessage(err, t, t.userProfile.failedToSubmitChangeRequest2), {
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
      decision === "approved" ? t.userProfile.approvingIdentityChange : t.userProfile.rejectingRequest,
    );

    try {
      const res = await decideProfileChangeAction(requestId, decision, notes);
      if (res.success) {
        toast.success(
          decision === "approved" ? t.userProfile.identityUpdateApprovedAndApplied : t.userProfile.identityChangeRejected,
          { id: toastId },
        );
        setRejectModalReqId(null);
        setRejectReason("");
        router.refresh();
      } else {
        toast.error(t.userProfile.decisionCouldNotBeApplied, { id: toastId });
      }
    } catch (err: any) {
      toast.error(errorMessage(err, t, t.userProfile.failedToApplyDecision), { id: toastId });
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
            <span>{t.userProfile.approved}</span>
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{t.userProfile.pendingReview}</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50">
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>{t.userProfile.rejected}</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400">
            <span>{t.userProfile.superseded}</span>
          </span>
        );
      default:
        return <StatusBadge status={status} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* Profile Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 text-accent font-bold text-2xl flex items-center justify-center font-display">
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
                  <bdi dir="ltr">{user.phone}</bdi>
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
              {t.userProfile.accountStatus}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t.userProfile.activeAndVerified}</span>
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
                {t.userProfile.pendingIdentityChangesAwaitingYour}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.userProfile.asReportingManagerCorporatePolicy}
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
                  className="p-4 rounded-xl bg-white dark:bg-surface-raised border border-amber-200 dark:border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-accent" />
                      <span>{req.user?.fullName || t.shared.employee}</span>
                      <span className="text-slate-400 font-normal">
                        ({req.user?.email})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(req.createdAt, locale)}
                    </span>
                  </div>

                  {/* Diff Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {newVals.fullName && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/60 dark:border-white/5 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {t.userProfile.fullNameChange}
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
                          {t.userProfile.emailChange}
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
                      <span>{t.shared.reject}</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDecide(req.id, "approved")}
                      disabled={isSubmittingDecision}
                      className="gap-1 text-xs bg-accent hover:bg-accent-pressed text-white"
                    >
                      <Check className="w-3 h-3" />
                      <span>
                        {decidingId === req.id
                          ? t.userProfile.approving
                          : t.userProfile.approveAndApply}
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
          <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <Phone className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.userProfile.n1ContactAndSignatureDirect}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.userProfile.phoneNumberAndAuthorizedSignature}
            </p>

            <form onSubmit={handleUpdateContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.shared.phoneNumber}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+973 39000000"
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-start"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUpdatingContact}
                  className="bg-accent hover:bg-accent-pressed text-white text-xs font-semibold"
                >
                  {isUpdatingContact ? t.shared.saving : t.userProfile.saveContactInfo}
                </Button>
              </div>
            </form>
          </div>

          {/* Section 2: Identity Change Request (Manager Approved) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.userProfile.n2IdentityChangeRequestManager}
              </h2>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                {t.userProfile.corporateGovernanceInvariant}
              </span>
              <p className="leading-relaxed">{t.userProfile.nameAndEmailModificationsCreate}</p>
            </div>

            <form onSubmit={handleSubmitIdentityChange} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.userProfile.proposedFullName}
                  </label>
                  <input
                    type="text"
                    value={proposedFullName}
                    onChange={(e) => setProposedFullName(e.target.value)}
                    placeholder={user.full_name}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {t.userProfile.current}
                    {user.full_name}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.userProfile.proposedEmail}
                  </label>
                  <input
                    type="email"
                    value={proposedEmail}
                    onChange={(e) => setProposedEmail(e.target.value)}
                    placeholder={user.email}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    {t.userProfile.current}
                    {user.email}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.userProfile.reasonForIdentityChange}
                </label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder={t.userProfile.eGLegalNameUpdate}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
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
                  className="bg-accent hover:bg-accent-pressed text-white text-xs font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingRequest ? t.shared.submitting : t.userProfile.submitForManagerReview}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Section 3: My Change Requests History */}
          <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span>{t.userProfile.n3MyIdentityChangeHistory}</span>
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
                            {formatDate(req.createdAt, locale)}
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">
                          {newVals.fullName && (
                            <span>
                              {t.userProfile.newName}
                              <strong>{newVals.fullName}</strong>{" "}
                            </span>
                          )}
                          {newVals.email && (
                            <span className="font-mono">
                              {t.userProfile.newEmail}
                              <strong>{newVals.email}</strong>
                            </span>
                          )}
                        </div>
                        {req.reviewNotes && (
                          <p className="text-[11px] text-slate-400 italic">
                            {t.userProfile.text}
                            {req.reviewNotes}
                            {t.userProfile.text2}
                          </p>
                        )}
                      </div>
                      <div className="text-end text-[11px] text-slate-400">
                        {req.reviewedAt
                          ? `${t.userProfile.reviewed}${formatDate(req.reviewedAt, locale)}`
                          : t.userProfile.awaitingAction}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                {t.userProfile.noIdentityChangeRequestsOn}
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Reporting Line & Employee Profile */}
        <div className="space-y-6">
          {/* Manager Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t.userProfile.assignedReportingManager}</span>
            </h3>

            {manager ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.userProfile.managerName}
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {manager.fullName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.shared.email}
                  </span>
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    {manager.email}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.userProfile.role}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold capitalize mt-0.5 inline-block">
                    {manager.role.replace("_", " ")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 text-xs text-slate-500">
                {t.userProfile.reportingDirectlyToSuperAdministration}
              </div>
            )}
          </div>

          {/* Linked Employee Record Card */}
          {employeeRecord && (
            <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{t.userProfile.linkedHrmsEmployeeRecord}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.userProfile.jobTitle}
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {isRTL
                      ? employeeRecord.jobTitleAr || employeeRecord.jobTitleEn
                      : employeeRecord.jobTitleEn}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.shared.department}
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
                      {t.userProfile.bahrainCprId}
                    </span>
                    <div className="font-mono text-slate-700 dark:text-slate-300">
                      •••• •••• {employeeRecord.cprNumber.slice(-3)}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {t.shared.hireDate}
                  </span>
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    {formatDate(employeeRecord.hireDate, locale, "long")}
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
          <div {...rejectDialog} className="bg-white dark:bg-surface-raised border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t.userProfile.reasonForRejection}
            </h3>

            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t.userProfile.stateReasonForRejectingThis}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalReqId(null)}
                disabled={isSubmittingDecision}
              >
                {t.shared.cancel}
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
                {isSubmittingDecision ? t.userProfile.rejecting : t.shared.confirmRejection}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
