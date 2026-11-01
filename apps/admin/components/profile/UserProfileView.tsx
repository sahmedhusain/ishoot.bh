"use client";
import { formatMessage } from "@platform/locales";
import Link from "next/link";
import { ROUTES } from "../../constants/routes";
import { errorMessage } from "../../lib/error-text";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Building,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Users,
  FileText,
} from "lucide-react";
import { Button, PhoneInput, StatusBadge, formatDate } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  updateMyProfileAction,
  requestIdentityChangeAction,
  cancelMyProfileChangeAction,
} from "../../app/actions/profile";
import type { Profile, ProfileChangeRequest } from "@platform/database";

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
}

export function UserProfileView({
  user,
  manager,
  employeeRecord,
  myRequests,
}: UserProfileViewProps) {
  const router = useRouter();
  const { isArabic, t, locale } = useAdminLocale();

  // Contact Form (Immediate Update)
  const [phone, setPhone] = React.useState(user.phone || "");
  const [isUpdatingContact, setIsUpdatingContact] = React.useState(false);

  // Identity Change Request Form (Manager Approved)
  const [proposedFullName, setProposedFullName] = React.useState("");
  const [proposedEmail, setProposedEmail] = React.useState("");
  const [changeReason, setChangeReason] = React.useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState<string | null>(null);

  // Handle Immediate Contact Update
  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContact(true);
    const toastId = toast.loading(t.userProfile.updatingContactDetails);

    try {
      const res = await updateMyProfileAction({
        phone: phone.trim() || null,
      });

      if (res.success) {
        toast.success(t.userProfile.contactDetailsUpdatedSuccessfully, {
          id: toastId,
        });
        router.refresh();
      } else {
        toast.error(t.userProfile.failedToUpdateProfile, { id: toastId });
      }
    } catch (err: any) {
      toast.error(errorMessage(err, t, t.userProfile.anErrorOccurred), {
        id: toastId,
      });
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
    const toastId = toast.loading(
      t.userProfile.submittingIdentityChangeRequest,
    );

    try {
      const res = await requestIdentityChangeAction({
        fullName: proposedFullName.trim() || undefined,
        email: proposedEmail.trim() || undefined,
        reason: changeReason.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          res.approvalStatus === "approved"
            ? t.profileWorkspace.identitySaved
            : t.userProfile.requestSubmittedSuccessfullyForManager,
          {
            id: toastId,
          },
        );
        setProposedFullName("");
        setProposedEmail("");
        setChangeReason("");
        router.refresh();
      } else {
        toast.error(t.userProfile.failedToSubmitChangeRequest, { id: toastId });
      }
    } catch (err: any) {
      toast.error(
        errorMessage(err, t, t.userProfile.failedToSubmitChangeRequest2),
        {
          id: toastId,
        },
      );
    } finally {
      setIsSubmittingRequest(false);
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken text-ink-muted dark:bg-white/10">
            <span>{t.profileWorkspace.withdrawn}</span>
          </span>
        );
      default:
        return <StatusBadge status={status} />;
    }
  };

  return (
    <div id="details" className="scroll-mt-20 space-y-6">
      {/* Profile Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 text-accent font-bold text-2xl flex items-center justify-center font-display">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-display">
                <bdi dir="auto">{user.full_name}</bdi>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-sunken dark:bg-white/10 text-ink">
                {(t.roles as Record<string, string>)[user.role] ?? user.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1 font-mono">
                <Mail className="w-3.5 h-3.5" />
                <span><bdi dir="ltr">{user.email}</bdi></span>
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
            <span className="text-[11px] text-ink-muted block">
              {t.userProfile.accountStatus}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                {user.is_active ? t.roles.statusActive : t.roles.statusInactive}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Contact Updates (Immediate) & Governance Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Self-Service Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Immediate Contact & Signature Update */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant dark:border-white/5">
              <Phone className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                {t.profileWorkspace.contact}
              </h2>
            </div>
            <p className="text-xs text-ink-muted">
              {t.profileWorkspace.contactHint}
            </p>

            <form onSubmit={handleUpdateContact} className="space-y-4">
              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-xs font-semibold text-ink mb-1"
                >
                  {t.shared.phoneNumber}
                </label>
                <PhoneInput
                  id="profile-phone"
                  value={phone}
                  onChange={setPhone}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUpdatingContact || phone === (user.phone ?? "")}
                  onClick={() => setPhone(user.phone ?? "")}
                >
                  {t.shared.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={
                    isUpdatingContact ||
                    phone.trim() === (user.phone ?? "").trim()
                  }
                  className="bg-accent hover:bg-accent-pressed text-accent-foreground text-xs font-semibold"
                >
                  {isUpdatingContact
                    ? t.shared.saving
                    : t.userProfile.saveContactInfo}
                </Button>
              </div>
            </form>
          </div>

          {/* Section 2: Identity Change Request (Manager Approved) */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant dark:border-white/5">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                {t.profileWorkspace.identity}
              </h2>
            </div>

            <div className="p-4 rounded-xl bg-surface-raised dark:bg-white/[0.02] border border-outline-variant/60 dark:border-white/5 text-xs text-ink-muted space-y-1">
              <span className="font-semibold text-ink block">
                {t.profileWorkspace.approvalRequired}
              </span>
              <p className="leading-relaxed">
                {t.userProfile.nameAndEmailModificationsCreate}
              </p>
            </div>

            <form onSubmit={handleSubmitIdentityChange} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-ink mb-1"
                  >
                    {t.userProfile.proposedFullName}
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    maxLength={150}
                    value={proposedFullName}
                    onChange={(e) => setProposedFullName(e.target.value)}
                    placeholder={user.full_name}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-black/30 text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <span className="text-[10px] text-ink-muted mt-1 block">
                    {formatMessage(t.profileWorkspace.currentName, {
                      name: user.full_name,
                    })}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-xs font-semibold text-ink mb-1"
                  >
                    {t.userProfile.proposedEmail}
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    maxLength={254}
                    value={proposedEmail}
                    onChange={(e) => setProposedEmail(e.target.value)}
                    placeholder={user.email}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-black/30 text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                  />
                  <span className="text-[10px] text-ink-muted mt-1 block font-mono">
                    {formatMessage(t.profileWorkspace.currentEmail, {
                      email: user.email,
                    })}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-reason"
                  className="block text-xs font-semibold text-ink mb-1"
                >
                  {t.userProfile.reasonForIdentityChange}
                </label>
                <textarea
                  id="profile-reason"
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder={t.userProfile.eGLegalNameUpdate}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-black/30 text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    isSubmittingRequest ||
                    (!proposedFullName && !proposedEmail && !changeReason)
                  }
                  onClick={() => {
                    setProposedFullName("");
                    setProposedEmail("");
                    setChangeReason("");
                  }}
                >
                  {t.shared.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={
                    isSubmittingRequest ||
                    (!(
                      proposedFullName.trim() &&
                      proposedFullName.trim() !== user.full_name
                    ) &&
                      !(
                        proposedEmail.trim() &&
                        proposedEmail.trim().toLowerCase() !==
                        user.email.toLowerCase()
                      ))
                  }
                  className="bg-accent hover:bg-accent-pressed text-accent-foreground text-xs font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingRequest
                      ? t.shared.submitting
                      : t.userProfile.submitForManagerReview}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Section 3: My Change Requests History */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span>{t.profileWorkspace.requests}</span>
            </h2>

            {myRequests.length > 0 ? (
              <div className="divide-y divide-outline-variant dark:divide-white/5">
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
                          <span className="font-mono text-[10px] text-ink-muted">
                            {formatDate(req.createdAt, locale)}
                          </span>
                        </div>
                        <div className="text-ink">
                          {newVals.fullName && (
                            <span>
                              {formatMessage(t.profileWorkspace.requestedName, {
                                name: newVals.fullName,
                              })}
                            </span>
                          )}
                          {newVals.email && (
                            <span className="font-mono">
                              {formatMessage(
                                t.profileWorkspace.requestedEmail,
                                { email: newVals.email },
                              )}
                            </span>
                          )}
                        </div>
                        {req.reviewNotes && (
                          <p className="text-[11px] text-ink-muted italic">
                            {formatMessage(t.profileWorkspace.reviewNote, {
                              note: req.reviewNotes,
                            })}
                          </p>
                        )}
                      </div>
                      <div className="text-end text-[11px] text-ink-muted">
                        {req.reviewedAt
                          ? formatMessage(t.profileWorkspace.reviewedDate, {
                            date: formatDate(req.reviewedAt, locale),
                          })
                          : req.status === "pending"
                            ? t.userProfile.awaitingAction
                            : ""}
                        {req.status === "pending" && (
                          <div className="mt-2 flex justify-end gap-3">
                            <Link
                              href={ROUTES.approvalItem(
                                "profile_change",
                                req.id,
                              )}
                              className="text-accent hover:underline"
                            >
                              {t.communications.open}
                            </Link>
                            <button
                              type="button"
                              disabled={withdrawing !== null}
                              onClick={async () => {
                                setWithdrawing(req.id);
                                try {
                                  await cancelMyProfileChangeAction(req.id);
                                  toast.success(
                                    t.profileWorkspace.requestWithdrawn,
                                  );
                                  router.refresh();
                                } catch (err) {
                                  toast.error(
                                    errorMessage(
                                      err,
                                      t,
                                      t.userProfile.failedToUpdateProfile,
                                    ),
                                  );
                                } finally {
                                  setWithdrawing(null);
                                }
                              }}
                              className="text-ink-muted hover:text-ink disabled:opacity-50"
                            >
                              {t.profileWorkspace.withdraw}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink-muted py-3 text-center">
                {t.userProfile.noIdentityChangeRequestsOn}
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Reporting Line & Employee Profile */}
        <div className="space-y-6">
          {/* Manager Card */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t.userProfile.assignedReportingManager}</span>
            </h3>

            {manager ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-ink-muted block text-[11px]">
                    {t.userProfile.managerName}
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    <bdi dir="auto">{manager.fullName}</bdi>
                  </div>
                </div>
                <div>
                  <span className="text-ink-muted block text-[11px]">
                    <bdi dir="ltr">{t.shared.email}</bdi>
                  </span>
                  <div className="font-mono text-ink">
                    <bdi dir="ltr">{manager.email}</bdi>
                  </div>
                </div>
                <div>
                  <span className="text-ink-muted block text-[11px]">
                    {t.userProfile.role}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-sunken dark:bg-white/10 text-ink font-semibold capitalize mt-0.5 inline-block">
                    {(t.roles as Record<string, string>)[manager.role] ??
                      manager.role}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-raised dark:bg-white/[0.02] border border-outline-variant/60 text-xs text-ink-muted">
                {t.userProfile.reportingDirectlyToSuperAdministration}
              </div>
            )}
          </div>

          {/* Linked Employee Record Card */}
          {employeeRecord && (
            <div className="p-6 rounded-2xl bg-surface-raised border border-outline-variant/80 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{t.userProfile.linkedHrmsEmployeeRecord}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-ink-muted block text-[11px]">
                    {t.userProfile.jobTitle}
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {isArabic
                      ? employeeRecord.jobTitleAr || employeeRecord.jobTitleEn
                      : employeeRecord.jobTitleEn}
                  </div>
                </div>

                <div>
                  <span className="text-ink-muted block text-[11px]">
                    {t.shared.department}
                  </span>
                  <div className="font-semibold text-ink mt-0.5">
                    {(isArabic
                      ? employeeRecord.department?.nameAr
                      : employeeRecord.department?.nameEn) ||
                      employeeRecord.departmentName ||
                      "—"}
                  </div>
                </div>

                {employeeRecord.cprNumber && (
                  <div>
                    <span className="text-ink-muted block text-[11px]">
                      {t.userProfile.bahrainCprId}
                    </span>
                    <div className="font-mono text-ink">
                      •••• •••• {employeeRecord.cprNumber.slice(-3)}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-ink-muted block text-[11px]">
                    {t.shared.hireDate}
                  </span>
                  <div className="font-mono text-ink">
                    {formatDate(employeeRecord.hireDate, locale, "long")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
