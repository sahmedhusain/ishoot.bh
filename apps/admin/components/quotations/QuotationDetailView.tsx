"use client";
import { useCompanyCurrency } from "@platform/ui";
import { useConfirmation } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Quotation, ApprovalRequest } from "@platform/database/types";
import { Select,
  Card,
  Button, Textarea, formatDate
} from "@platform/ui";
import { DocumentDetailHeader, DocumentHeaderChip } from "../documents/DocumentDetailHeader";
import { DocumentStatusBanner, type DocumentStatusMeta } from "../documents/DocumentStatusBanner";
import { DocumentLinesCard } from "../documents/DocumentLinesCard";
import { DocumentTotals } from "../documents/DocumentTotals";
import { DocumentCard, DocumentBilingualText } from "../documents/DocumentCard";
import { DocumentInfoCard, DocumentPartyDetails } from "../documents/DocumentInfoCard";
import {
  Send,
  CheckCircle2,
  XCircle,
  FileCheck,
  Receipt,
  Clock,
  ShieldAlert,
  Calendar,
  User,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  submitQuotationForApprovalAction,
  issueQuotationAction,
  acceptQuotationAction,
  rejectQuotationAction,
  convertQuotationToInvoiceAction,
} from "../../app/actions/quotations";
import { decideApprovalAction } from "../../app/actions/approvals";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { QuotationActionDialog } from "./QuotationActionDialog";
import { toast } from "sonner";

interface QuotationWithRelations extends Quotation {
  client?: {
    id?: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    taxNumber?: string;
    vat_number?: string;
  } | null;
  createdBy?: {
    id?: string;
    fullName?: string;
    email?: string;
  } | null;
  invoice?: {
    id?: string;
    invoiceNumber?: string;
    status?: string;
  } | null;
}

interface QuotationDetailViewProps {
  quotation: QuotationWithRelations;
  approvalRequest?: ApprovalRequest | null;
  currentUserId: string;
  currentUserRole?: string;
  canApprove: boolean;
  canIssue: boolean;
  canEdit?: boolean;
}

export function QuotationDetailView({
  quotation,
  approvalRequest,
  currentUserId,
  currentUserRole = "viewer",
  canApprove,
  canIssue,
  canEdit = false,
}: QuotationDetailViewProps) {
  const router = useRouter();
  const confirmAction = useConfirmation();
  const companyCurrency = useCompanyCurrency();
  const { t, locale } = useAdminLocale();
  const qdT = t.quotationDetail;
  const qListT = t.quotationsList;

  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  // Dialog states
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);
  const [discountReason, setDiscountReason] = React.useState("");

  const [showApproveModal, setShowApproveModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const [showIssueModal, setShowIssueModal] = React.useState(false);
  const [deliveryChannel, setDeliveryChannel] = React.useState<"email" | "portal" | "whatsapp" | "manual">("email");

  const [showDeclineModal, setShowDeclineModal] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState("");
  const [declineError, setDeclineError] = React.useState("");
  const declining = React.useRef(false);
  const declineId = React.useId();
  const [showAcceptModal, setShowAcceptModal] = React.useState(false);
  const [acceptanceEvidence, setAcceptanceEvidence] = React.useState("");

  const isCreator = quotation.createdById === currentUserId;
  const hasDiscount = Number(quotation.discountAmount) > 0;

  // Status mapping
  const statusMeta: Record<string, DocumentStatusMeta> = {
    draft: { label: t.statusLabels.draft, color: "bg-surface-sunken text-ink dark:bg-surface-raised dark:text-ink", icon: Clock },
    submitted: { label: t.quotationDetail.pendingApproval, color: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300", icon: Clock },
    approved: { label: t.quotationDetail.approvedBySuperAdmin, color: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300", icon: CheckCircle2 },
    issued: { label: t.quotationDetail.issuedToClient, color: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300", icon: Send },
    accepted: { label: t.quotationDetail.acceptedByClient, color: "bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300", icon: FileCheck },
    converted: { label: t.quotationDetail.convertedToInvoice, color: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300", icon: Receipt },
    rejected: { label: t.statusLabels.rejected, color: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300", icon: XCircle },
    expired: { label: t.statusLabels.expired, color: "bg-stone-100 text-stone-600 dark:bg-surface-raised dark:text-ink-muted", icon: AlertCircle },
  };

  // Handlers
  const handleSubmitForApproval = async () => {
    if (hasDiscount && !discountReason.trim()) {
      toast.error(t.quotationDetail.pleaseProvideJustificationForThe);
      return;
    }
    setLoadingAction("submit");
    const toastId = toast.loading(t.quotationDetail.submittingForSuperAdminReview);
    try {
      const res = await submitQuotationForApprovalAction(quotation.id, discountReason.trim() || undefined);
      if (res.success) {
        toast.success(t.quotationDetail.quotationSubmittedForSuperAdmin, { id: toastId });
        setShowSubmitModal(false);
        router.refresh();
      } else {
        toast.error(t.quotationDetail.failedToSubmitQuotation, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.quotationDetail.errorSubmittingQuotation), { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprove = async () => {
    if (!approvalRequest) {
      toast.error(t.quotationDetail.noActiveApprovalRequestFound);
      return;
    }
    setLoadingAction("approve");
    const toastId = toast.loading(t.quotationDetail.recordingSuperAdminApproval);
    try {
      const res = await decideApprovalAction(approvalRequest.id, "approved");
      if (res.success) {
        toast.success(t.quotationDetail.quotationApprovedSuccessfully, { id: toastId });
        setShowApproveModal(false);
        router.refresh();
      } else {
        toast.error(t.quotationDetail.failedToApproveQuotation, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.quotationDetail.approvalFailed), { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async () => {
    if (!approvalRequest) {
      toast.error(t.quotationDetail.noActiveApprovalRequestFound2);
      return;
    }
    setLoadingAction("reject");
    const toastId = toast.loading(t.quotationDetail.recordingRejection);
    try {
      const res = await decideApprovalAction(approvalRequest.id, "rejected", rejectReason);
      if (res.success) {
        toast.success(t.quotationDetail.quotationRejected, { id: toastId });
        setShowRejectModal(false);
        router.refresh();
      } else {
        toast.error(t.quotationDetail.failedToRejectQuotation, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.quotationDetail.rejectionFailed), { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleIssue = async () => {
    setLoadingAction("issue");
    const toastId = toast.loading(t.quotationDetail.issuingQuotationToClient);
    try {
      const res = await issueQuotationAction(quotation.id, deliveryChannel);
      if (res.success) {
        toast.success(formatMessage(t.newQuotationForm.issuedVia, { channel: deliveryChannel }), { id: toastId });
        setShowIssueModal(false);
        router.refresh();
      } else {
        toast.error(t.quotationDetail.failedToIssueQuotation, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.quotationDetail.issuanceFailed), { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAccept = async () => {
    setLoadingAction("accept");
    const toastId = toast.loading(t.quotationDetail.recordingClientAcceptance);
    try {
      const res = await acceptQuotationAction(quotation.id, acceptanceEvidence.trim() || undefined);
      if (res.success) {
        toast.success(t.quotationDetail.quotationMarkedAsAcceptedBy, { id: toastId });
        setShowAcceptModal(false);
        router.refresh();
      } else {
        toast.error(t.quotationDetail.failedToAcceptQuotation, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.quotationDetail.actionFailed), { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClientDeclined = async () => {
    if (declining.current) return;
    declining.current = true; setDeclineError("");
    setLoadingAction("decline");
    try {
      await rejectQuotationAction(quotation.id, declineReason.trim() || undefined);
      setShowDeclineModal(false);
      toast.success(t.quotationLifecycle.declined);
      router.refresh();
    } catch (err: unknown) {
      const message = errorMessage(err, t, t.quotationLifecycle.failed);
      setDeclineError(message); toast.error(message);
    } finally {
      declining.current = false; setLoadingAction(null);
    }
  };

  const handleConvertToInvoice = () => confirmAction({
    title: t.newInvoiceForm.convertConfirmTitle,
    description: t.newInvoiceForm.convertConfirmBody,
    variant: "warning",
    onConfirm: async () => {
      setLoadingAction("convert");
      const toastId = toast.loading(t.quotationDetail.convertingQuotationToTaxInvoice);
      try {
        const res = await convertQuotationToInvoiceAction(quotation.id);
        if (res.success && res.invoice) {
          toast.success(
            res.invoice.isExisting
              ? formatMessage(t.copy.existingInvoice, { number: res.invoice.invoiceNumber })
              : formatMessage(t.copy.generatedInvoice, { number: res.invoice.invoiceNumber }),
            { id: toastId },
          );
          router.push(ROUTES.invoices.detail(res.invoice.invoiceId));
        } else {
          throw new Error(t.quotationDetail.failedToConvertQuotation);
        }
      } catch (err: unknown) {
        toast.error(errorMessage(err, t, t.quotationDetail.conversionFailed), { id: toastId });
        throw err;
      } finally {
        setLoadingAction(null);
      }
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <DocumentDetailHeader
        backHref={ROUTES.quotations.list}
        eyebrow={qdT.commercialQuotation}
        chips={<DocumentHeaderChip>{qdT.revision} #{quotation.revision}</DocumentHeaderChip>}
        number={quotation.quotationNumber}
        pdf={{ type: "quotation", id: quotation.id, number: quotation.quotationNumber }}
        actions={
          <>
            {/* Status: Draft -> Submit */}
            {quotation.status === "draft" && (
              <Button
                onClick={() => {
                  if (hasDiscount) {
                    setShowSubmitModal(true);
                  } else {
                    handleSubmitForApproval();
                  }
                }}
                disabled={loadingAction === "submit"}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{qdT.submitForApproval}</span>
              </Button>
            )}

            {/* Status: Submitted -> Super Admin Review */}
            {quotation.status === "submitted" && canApprove && (
              <>
                {isCreator ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs rounded-md border border-amber-200 dark:border-amber-900/50">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>{t.quotationDetail.makerCheckerYouCreatedThis}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowRejectModal(true)}
                      disabled={!!loadingAction}
                      className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/50 px-3 py-2 rounded-md text-xs font-medium"
                    >
                      <XCircle className="w-4 h-4 me-1 inline" />
                      {qdT.rejectBtn}
                    </Button>
                    <Button
                      onClick={() => setShowApproveModal(true)}
                      disabled={!!loadingAction}
                      className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md text-xs font-medium shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 me-1 inline" />
                      {qdT.approveBtn}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Status: Approved -> Issue to Client */}
            {quotation.status === "approved" && canIssue && (
              <Button
                onClick={() => setShowIssueModal(true)}
                disabled={loadingAction === "issue"}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{qdT.issueToClient}</span>
              </Button>
            )}

            {/* Status: Issued -> Accept / Reject by Client */}
            {quotation.status === "issued" && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowAcceptModal(true)}
                  disabled={loadingAction === "accept"}
                  className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 rounded-md text-xs font-medium"
                >
                  <Check className="w-4 h-4" />
                  <span>{qdT.recordAcceptance}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setDeclineReason(""); setDeclineError(""); setShowDeclineModal(true); }}
                  disabled={loadingAction === "decline"}
                  className="text-xs"
                >
                  {t.quotationLifecycle.clientDeclined}
                </Button>
              </div>
            )}

            {/* Status: Accepted -> Convert to Invoice */}
            {quotation.status === "accepted" && !quotation.invoiceId && quotation.currency === companyCurrency && (
              <Button
                onClick={handleConvertToInvoice}
                disabled={loadingAction === "convert"}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all"
              >
                <Receipt className="w-4 h-4" />
                <span>{qdT.convertToInvoice}</span>
              </Button>
            )}

            {/* Linked Invoice if Converted */}
            {(quotation.status === "converted" || Boolean(quotation.invoiceId)) && quotation.invoiceId && (
              <Link
                href={ROUTES.invoices.detail(quotation.invoiceId)}
                className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 px-3.5 py-2 rounded-md text-xs font-mono font-medium hover:bg-purple-100 transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span>{qdT.viewInvoice} {quotation.invoice?.invoiceNumber || ""}</span>
              </Link>
            )}
          </>
        }
      />

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          <DocumentStatusBanner
            status={quotation.status}
            statusMeta={statusMeta}
            fallback="draft"
            caption={qdT.currentLifecycle}
            label={qListT.statuses[quotation.status as keyof typeof qListT.statuses]}
          >
            {quotation.status === "issued" && quotation.deliveryChannel && (
              <span className="text-xs font-mono uppercase bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                {t.quotationDetail.via} {quotation.deliveryChannel}
              </span>
            )}
          </DocumentStatusBanner>

          <DocumentLinesCard
            title={qdT.scopeTitle}
            currency={quotation.currency}
            lines={(quotation.lineItems ?? []).map((item) => ({
              id: item.id,
              descriptionEn: item.descriptionEn,
              descriptionAr: item.descriptionAr,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            }))}
          >
            <DocumentTotals
              currency={quotation.currency}
              subtotal={quotation.subtotal}
              discount={{
                amount: quotation.discountAmount,
                label: `${qdT.discount} (${quotation.discountType})`,
                className: "text-amber-600 dark:text-amber-400",
              }}
              vat={quotation.vatEnabled ? { percentage: quotation.vatPercentage, amount: quotation.vatAmount } : null}
              taxes={quotation.taxes ?? []}
              total={quotation.totalAmount}
            />
          </DocumentLinesCard>

          <DocumentCard title={qdT.termsTitle}>
            <DocumentBilingualText
              en={{ label: t.quotationDetail.englishTerms, text: quotation.termsEn, empty: t.quotationDetail.noEnglishTermsSpecified }}
              ar={{ label: t.quotationDetail.arabicTerms, text: quotation.termsAr, empty: t.quotationDetail.noArabicTermsSpecified }}
            />
          </DocumentCard>
        </div>

        {/* Right 1 Col: Metadata & Audit Box */}
        <div className="space-y-6">
          <DocumentInfoCard title={qdT.particularsTitle}>
            <DocumentPartyDetails
              name={quotation.client?.companyName || `${quotation.client?.firstName || ""} ${quotation.client?.lastName || ""}`}
              lines={[
                quotation.client?.email && <><bdi dir="ltr">{qdT.email}</bdi>: <bdi dir="ltr">{quotation.client.email}</bdi></>,
                quotation.client?.phone && <><bdi dir="ltr">{qdT.phone}</bdi>: <bdi dir="ltr">{quotation.client.phone}</bdi></>,
                quotation.vatEnabled && quotation.client?.taxNumber && <>{t.quotationDetail.vatId} {quotation.client.taxNumber}</>,
              ].filter(Boolean)}
            />
          </DocumentInfoCard>

          <DocumentInfoCard
            title={t.quotationDetail.documentLifecycle}
            rows={[
              { label: `${qdT.issueDate}:`, icon: Calendar, value: formatDate(quotation.issueDate, locale, "long") },
              { label: `${qdT.validUntil}:`, icon: Calendar, value: formatDate(quotation.validUntilDate, locale, "long") },
              {
                label: t.quotationDetail.preparedBy,
                icon: User,
                mono: false,
                value: <bdi dir="auto">{quotation.createdBy?.fullName || quotation.createdBy?.email || t.quotationDetail.unknownUser}</bdi>,
              },
            ]}
          />

          {/* Super Admin Approval Box */}
          {approvalRequest && (
            <Card className="p-6 bg-surface-raised dark:bg-surface-raised/50 border border-outline-variant rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-outline-variant dark:border-white/10 pb-2">
                <span className="text-xs font-mono uppercase text-ink-muted">{t.quotationDetail.governanceReview}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-sunken dark:bg-surface-raised text-ink dark:text-ink">
                  {approvalRequest.status}
                </span>
              </div>
              {approvalRequest.discountReason && (
                <div className="text-xs space-y-1">
                  <span className="text-ink-muted font-mono text-[11px]">{t.quotationDetail.commercialDiscountReason}</span>
                  <div className="p-2 bg-surface-raised dark:bg-surface-raised rounded border border-outline-variant dark:border-white/5 font-mono text-ink dark:text-ink">
                    {approvalRequest.discountReason}
                  </div>
                </div>
              )}
              {approvalRequest.decisions && approvalRequest.decisions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-outline-variant dark:border-white/10 text-xs">
                  <span className="text-ink-muted font-mono text-[11px]">{t.quotationDetail.decisionsHistory}</span>
                  {approvalRequest.decisions.map((dec) => (
                    <div key={dec.id} className="p-2 rounded bg-surface-raised dark:bg-surface-raised border border-outline-variant dark:border-white/5 text-[11px]">
                      <div className="font-semibold text-ink dark:text-ink capitalize">
                        {dec.decision} {t.copy.by}<bdi dir="auto">{dec.decidedBy?.fullName || t.quotationDetail.superAdmin}</bdi>
                      </div>
                      <div className="text-ink-muted font-mono text-[10px]">
                        {formatDate(dec.decidedAt, locale, "time")}
                      </div>
                      {dec.reason && <div className="text-ink-muted dark:text-ink-muted mt-1">{dec.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <QuotationActionDialog open={showDeclineModal} onClose={() => setShowDeclineModal(false)} title={t.quotationLifecycle.markDeclined} description={t.quotationLifecycle.declineConfirmBody} confirmLabel={t.quotationLifecycle.markDeclined} confirmVariant="danger" busy={loadingAction === "decline"} onConfirm={handleClientDeclined}>
        <label htmlFor={declineId} className="block text-sm font-medium">{t.quotationLifecycle.declineReasonPrompt}</label>
        <Textarea id={declineId} value={declineReason} onChange={event => { setDeclineReason(event.target.value); setDeclineError(""); }} disabled={loadingAction === "decline"} maxLength={1000} placeholder={t.quotationLifecycle.declineReasonPlaceholder} aria-invalid={!!declineError} aria-describedby={declineError ? `${declineId}-error` : undefined} />
        {declineError && <p id={`${declineId}-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-300">{declineError}</p>}
      </QuotationActionDialog>
      <QuotationActionDialog
        open={showSubmitModal}
        busy={loadingAction === "submit"}
        onClose={() => setShowSubmitModal(false)}
        title={t.quotationDetail.commercialDiscountJustificationRequired}
        description={
          <>
            {t.quotationDetail.thisQuotationContainsACommercial}{" "}
            <strong className="font-mono text-ink dark:text-ink">
              {Number(quotation.discountAmount).toFixed(3)} {quotation.currency}
            </strong>
            {t.quotationDetail.superAdminApprovalPolicyStrictly}
          </>
        }
        confirmLabel={t.quotationDetail.submitForApproval2}
        confirmVariant="primary"
        confirmDisabled={!discountReason.trim() || loadingAction === "submit"}
        onConfirm={handleSubmitForApproval}
      >
        <label className="block text-xs font-medium text-ink dark:text-ink mb-1">
          {t.quotationDetail.discountReasonAndBusinessJustification}
          <textarea
            rows={3}
            required
            value={discountReason}
            onChange={(e) => setDiscountReason(e.target.value)}
            placeholder={t.quotationDetail.eGVolumeDiscountNegotiated}
            className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink mt-1"
          />
        </label>
      </QuotationActionDialog>

      <QuotationActionDialog
        open={showIssueModal}
        busy={loadingAction === "issue"}
        onClose={() => setShowIssueModal(false)}
        title={t.quotationDetail.issueQuotationToClient}
        description={t.quotationDetail.selectTheDeliveryMethodOnce}
        confirmLabel={t.quotationDetail.confirmIssue}
        confirmVariant="primary"
        confirmDisabled={loadingAction === "issue"}
        onConfirm={handleIssue}
      >
        <label className="block text-xs font-medium text-ink dark:text-ink mb-1">
          {t.quotationDetail.deliveryChannel}
          <Select
            value={deliveryChannel}
            onChange={(e) => setDeliveryChannel(e.target.value as typeof deliveryChannel)}
            className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink mt-1"
          >
            <option value="email">{t.quotationDetail.emailNotificationToClient}</option>
            <option value="portal">{t.quotationDetail.publishToClientPortal}</option>
            <option value="whatsapp">{t.quotationDetail.directWhatsappDispatch}</option>
            <option value="manual">{t.quotationDetail.manualInPersonPrintedHandover}</option>
          </Select>
        </label>
      </QuotationActionDialog>

      <QuotationActionDialog
        open={showApproveModal}
        busy={loadingAction === "approve"}
        onClose={() => setShowApproveModal(false)}
        title={t.quotationDetail.confirmSuperAdminApproval}
        description={
          <>
            {t.quotationDetail.areYouSureYouWant} <strong><bdi dir="ltr">{quotation.quotationNumber}</bdi></strong> {t.quotationDetail.forATotalOf}{" "}
            <strong>{Number(quotation.totalAmount).toFixed(3)} {quotation.currency}</strong>?
          </>
        }
        confirmLabel={t.quotationDetail.confirmApproval}
        confirmVariant="primary"
        confirmDisabled={loadingAction === "approve"}
        onConfirm={handleApprove}
      />

      <QuotationActionDialog
        open={showRejectModal}
        busy={loadingAction === "reject"}
        onClose={() => setShowRejectModal(false)}
        title={t.quotationDetail.rejectQuotation}
        description={t.quotationDetail.provideFeedbackOnWhyThis}
        confirmLabel={t.quotationDetail.confirmRejection}
        confirmVariant="danger"
        confirmDisabled={!rejectReason.trim() || loadingAction === "reject"}
        onConfirm={handleReject}
      >
        <label className="block text-xs font-medium text-ink dark:text-ink mb-1">
          {t.quotationDetail.rejectionReason}
          <textarea
            rows={3}
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t.quotationDetail.eGDiscountExceedsAllowed}
            className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink mt-1"
          />
        </label>
      </QuotationActionDialog>

      <QuotationActionDialog
        open={showAcceptModal}
        busy={loadingAction === "accept"}
        onClose={() => setShowAcceptModal(false)}
        title={t.quotationDetail.recordClientAcceptance}
        description={t.quotationDetail.enterReferenceEvidenceOfClient}
        confirmLabel={t.quotationDetail.recordAcceptance}
        confirmVariant="primary"
        confirmDisabled={loadingAction === "accept"}
        onConfirm={handleAccept}
      >
        <label className="block text-xs font-medium text-ink dark:text-ink mb-1">
          {t.quotationDetail.acceptanceReferenceNotes}
          <input
            type="text"
            value={acceptanceEvidence}
            onChange={(e) => setAcceptanceEvidence(e.target.value)}
            placeholder={t.quotationDetail.eGSignedPoPo}
            className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink mt-1"
          />
        </label>
      </QuotationActionDialog>
    </div>
  );
}
