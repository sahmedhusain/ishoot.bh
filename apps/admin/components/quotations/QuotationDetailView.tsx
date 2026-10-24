"use client";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Quotation, ApprovalRequest } from "@platform/database/types";
import {
  Card,
  Button, formatDate } from "@platform/ui";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle2,
  XCircle,
  FileCheck,
  Receipt,
  Clock,
  ShieldAlert,
  Globe2,
  FileText,
  Calendar,
  Building,
  User,
  Check,
  AlertCircle,
  Printer,
  Download,
} from "lucide-react";
import { downloadDocumentPdf, printDocumentPdf } from "../../lib/pdf-print";
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
  const { isRTL, t, locale } = useAdminLocale();
  const [printing, setPrinting] = React.useState(false);
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

  const [showAcceptModal, setShowAcceptModal] = React.useState(false);
  const [acceptanceEvidence, setAcceptanceEvidence] = React.useState("");

  const isCreator = quotation.createdById === currentUserId;
  const hasDiscount = Number(quotation.discountAmount) > 0;
  const isNonBhd = quotation.currency !== "BHD";

  // Status mapping
  const statusMeta: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    draft: { label: t.statusLabels.draft, color: "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300", icon: Clock },
    submitted: { label: t.quotationDetail.pendingApproval, color: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300", icon: Clock },
    approved: { label: t.quotationDetail.approvedBySuperAdmin, color: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300", icon: CheckCircle2 },
    issued: { label: t.quotationDetail.issuedToClient, color: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300", icon: Send },
    accepted: { label: t.quotationDetail.acceptedByClient, color: "bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300", icon: FileCheck },
    converted: { label: t.quotationDetail.convertedToInvoice, color: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300", icon: Receipt },
    rejected: { label: t.statusLabels.rejected, color: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300", icon: XCircle },
    expired: { label: t.statusLabels.expired, color: "bg-stone-100 text-stone-600 dark:bg-neutral-800 dark:text-neutral-400", icon: AlertCircle },
  };

  const currentStatusMeta = statusMeta[quotation.status] || statusMeta.draft;
  const StatusIcon = currentStatusMeta.icon;

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
    const reason = window.prompt(t.quotationLifecycle.declineReasonPrompt) ?? undefined;
    setLoadingAction("decline");
    try {
      await rejectQuotationAction(quotation.id, reason?.trim() || undefined);
      toast.success(t.quotationLifecycle.declined);
      router.refresh();
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.quotationLifecycle.failed));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConvertToInvoice = async () => {
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
        toast.error(t.quotationDetail.failedToConvertQuotation, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.quotationDetail.conversionFailed), { id: toastId });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.quotations.list}
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-widest text-accent font-medium">
                {qdT.commercialQuotation}
              </span>
              <span className="text-xs font-mono bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-slate-600 dark:text-neutral-400">
                {qdT.revision} #{quotation.revision}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {quotation.quotationNumber}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={printing}
            onClick={async () => {
              setPrinting(true);
              try {
                await printDocumentPdf("quotation", quotation.id, locale);
              } catch {
                toast.error(t.pdfActions.failed);
              } finally {
                setPrinting(false);
              }
            }}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{printing ? t.pdfActions.preparing : t.pdfActions.print}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadDocumentPdf("quotation", quotation.id, quotation.quotationNumber, locale)}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{t.pdfActions.download}</span>
          </Button>
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
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all"
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
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-xs font-medium shadow-xs"
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
                onClick={handleClientDeclined}
                disabled={loadingAction === "decline"}
                className="text-xs"
              >
                {t.quotationLifecycle.clientDeclined}
              </Button>
            </div>
          )}

          {/* Status: Accepted -> Convert to Invoice */}
          {quotation.status === "accepted" && !quotation.invoiceId && (
            <Button
              onClick={handleConvertToInvoice}
              disabled={loadingAction === "convert"}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all"
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
        </div>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-surface-raised border border-ink/10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${currentStatusMeta.color}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-neutral-400">{qdT.currentLifecycle}</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {qListT.statuses[quotation.status as keyof typeof qListT.statuses] || currentStatusMeta.label}
                </div>
              </div>
            </div>
            {quotation.status === "issued" && quotation.deliveryChannel && (
              <span className="text-xs font-mono uppercase bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                {t.quotationDetail.via} {quotation.deliveryChannel}
              </span>
            )}
          </div>

          {/* 3% FX Margin Notice (if non-BHD) */}
          {isNonBhd && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300 font-mono uppercase">
                <Globe2 className="w-4 h-4 text-amber-700" />
                {qdT.fxLockTitle}
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-500">{qdT.rawMarketRate}</span>
                  <div className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                    {quotation.rawRate ? Number(quotation.rawRate).toFixed(4) : t.copy.notAvailable}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">{qdT.fxSafetyBuffer}</span>
                  <div className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                    +{Number(quotation.fxMarginPercent)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">{qdT.effectiveRate}</span>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {quotation.effectiveRate ? Number(quotation.effectiveRate).toFixed(4) : "—"} {quotation.currency}{formatMessage(t.copy.currencyRate, { currency: "BHD" })}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                {formatMessage(qdT.fxNotice, { rate: Number(quotation.fxMarginPercent) })}
              </p>
            </div>
          )}

          {/* Line Items Table */}
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2 border-b border-ink/10 pb-3">
              <FileText className="w-4 h-4 text-accent" />
              {qdT.scopeTitle}
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-xs font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3">{qdT.colNum}</th>
                    <th className="py-2.5 px-3">{qdT.colDesc}</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left">{qdT.colQty}</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left">{qdT.colUnit} ({quotation.currency})</th>
                    <th className="py-2.5 px-3 text-right rtl:text-left">{qdT.colTotal} ({quotation.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10 dark:divide-white/5">
                  {quotation.lineItems?.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-3 text-xs font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">{item.descriptionEn}</div>
                        {item.descriptionAr && (
                          <div className="text-xs text-slate-500 font-sans" dir="rtl">
                            {item.descriptionAr}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-end font-mono">{Number(item.quantity)}</td>
                      <td className="py-3 px-3 text-end font-mono">{Number(item.unitPrice).toFixed(3)}</td>
                      <td className="py-3 px-3 text-end font-mono font-semibold text-slate-900 dark:text-white">
                        {Number(item.lineTotal).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t border-ink/10 flex justify-end">
              <div className="w-72 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                  <span>{qdT.subtotal}</span>
                  <span className="font-mono font-medium">{Number(quotation.subtotal).toFixed(3)} {quotation.currency}</span>
                </div>
                {Number(quotation.discountAmount) > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>{qdT.discount} ({quotation.discountType})</span>
                    <span className="font-mono font-medium">-{Number(quotation.discountAmount).toFixed(3)} {quotation.currency}</span>
                  </div>
                )}
                {quotation.vatEnabled && (
                  <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                    <span>{qdT.vat} ({Number(quotation.vatPercentage)}%)</span>
                    <span className="font-mono font-medium">+{Number(quotation.vatAmount).toFixed(3)} {quotation.currency}</span>
                  </div>
                )}
                {(quotation.taxes ?? []).map((tax) => (
                  <div key={tax.code} className="flex justify-between text-slate-600 dark:text-neutral-400">
                    <span>{locale === "ar" ? tax.name_ar : tax.name_en} ({tax.rate}%)</span>
                    <span className="font-mono font-medium">+{tax.amount.toFixed(3)} {quotation.currency}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white border-t border-ink/10 pt-2">
                  <span>{qdT.totalPayable}</span>
                  <span className="font-mono text-primary dark:text-mint">
                    {Number(quotation.totalAmount).toFixed(3)} {quotation.currency}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bilingual Terms */}
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-ink/10 pb-3">
              {qdT.termsTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-mono uppercase text-slate-400 mb-1">{t.quotationDetail.englishTerms}</div>
                <div className="p-3 bg-slate-50 dark:bg-neutral-900/50 rounded-md text-xs font-mono text-slate-700 dark:text-neutral-300 whitespace-pre-line">
                  {quotation.termsEn || (t.quotationDetail.noEnglishTermsSpecified)}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono uppercase text-slate-400 mb-1">{t.quotationDetail.arabicTerms}</div>
                <div className="p-3 bg-slate-50 dark:bg-neutral-900/50 rounded-md text-xs font-mono text-slate-700 dark:text-neutral-300 whitespace-pre-line" dir="rtl">
                  {quotation.termsAr || (t.quotationDetail.noArabicTermsSpecified)}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Metadata & Audit Box */}
        <div className="space-y-6">
          {/* Client Card */}
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 border-b border-ink/10 pb-2">
              {qdT.particularsTitle}
            </h2>
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Building className="w-4 h-4 text-accent" />
                {quotation.client?.companyName || `${quotation.client?.firstName || ""} ${quotation.client?.lastName || ""}`}
              </div>
              {quotation.client?.email && (
                <div className="text-slate-500">{qdT.email}: {quotation.client.email}</div>
              )}
              {quotation.client?.phone && (
                <div className="text-slate-500">{qdT.phone}: <bdi dir="ltr">{quotation.client.phone}</bdi></div>
              )}
              {quotation.vatEnabled && quotation.client?.taxNumber && (
                <div className="text-slate-500">{t.quotationDetail.vatId} {quotation.client.taxNumber}</div>
              )}
            </div>
          </Card>

          {/* Dates & Timeline */}
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 border-b border-ink/10 pb-2">
              {t.quotationDetail.documentLifecycle}
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">{qdT.issueDate}:</span>
                <div className="font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(quotation.issueDate, locale, "long")}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{qdT.validUntil}:</span>
                <div className="font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(quotation.validUntilDate, locale, "long")}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{t.quotationDetail.preparedBy}</span>
                <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {quotation.createdBy?.fullName || quotation.createdBy?.email || t.quotationDetail.unknownUser}
                </div>
              </div>
            </div>
          </Card>

          {/* Super Admin Approval Box */}
          {approvalRequest && (
            <Card className="p-6 bg-slate-50 dark:bg-neutral-900/50 border border-ink/10 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                <span className="text-xs font-mono uppercase text-slate-500">{t.quotationDetail.governanceReview}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                  {approvalRequest.status}
                </span>
              </div>
              {approvalRequest.discountReason && (
                <div className="text-xs space-y-1">
                  <span className="text-slate-400 font-mono text-[11px]">{t.quotationDetail.commercialDiscountReason}</span>
                  <div className="p-2 bg-white dark:bg-neutral-800 rounded border border-slate-200 dark:border-white/5 font-mono text-slate-800 dark:text-neutral-200">
                    {approvalRequest.discountReason}
                  </div>
                </div>
              )}
              {approvalRequest.decisions && approvalRequest.decisions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">{t.quotationDetail.decisionsHistory}</span>
                  {approvalRequest.decisions.map((dec) => (
                    <div key={dec.id} className="p-2 rounded bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/5 text-[11px]">
                      <div className="font-semibold text-slate-900 dark:text-white capitalize">
                        {dec.decision} {t.copy.by}{dec.decidedBy?.fullName || t.quotationDetail.superAdmin}
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        {formatDate(dec.decidedAt, locale, "time")}
                      </div>
                      {dec.reason && <div className="text-slate-600 dark:text-neutral-400 mt-1">{dec.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <QuotationActionDialog
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title={t.quotationDetail.commercialDiscountJustificationRequired}
        description={
          <>
            {t.quotationDetail.thisQuotationContainsACommercial}{" "}
            <strong className="font-mono text-slate-900 dark:text-white">
              {Number(quotation.discountAmount).toFixed(3)} {quotation.currency}
            </strong>
            {t.quotationDetail.superAdminApprovalPolicyStrictly}
          </>
        }
        confirmLabel={t.quotationDetail.submitForApproval2}
        confirmClassName="bg-primary hover:bg-primary-hover"
        confirmDisabled={!discountReason.trim() || loadingAction === "submit"}
        onConfirm={handleSubmitForApproval}
      >
        <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
          {t.quotationDetail.discountReasonAndBusinessJustification}
          <textarea
            rows={3}
            required
            value={discountReason}
            onChange={(e) => setDiscountReason(e.target.value)}
            placeholder={t.quotationDetail.eGVolumeDiscountNegotiated}
            className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white mt-1"
          />
        </label>
      </QuotationActionDialog>

      <QuotationActionDialog
        open={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title={t.quotationDetail.issueQuotationToClient}
        description={t.quotationDetail.selectTheDeliveryMethodOnce}
        confirmLabel={t.quotationDetail.confirmIssue}
        confirmClassName="bg-blue-600 hover:bg-blue-700"
        confirmDisabled={loadingAction === "issue"}
        onConfirm={handleIssue}
      >
        <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
          {t.quotationDetail.deliveryChannel}
          <select
            value={deliveryChannel}
            onChange={(e) => setDeliveryChannel(e.target.value as typeof deliveryChannel)}
            className="w-full text-xs rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white mt-1"
          >
            <option value="email">{t.quotationDetail.emailNotificationToClient}</option>
            <option value="portal">{t.quotationDetail.publishToClientPortal}</option>
            <option value="whatsapp">{t.quotationDetail.directWhatsappDispatch}</option>
            <option value="manual">{t.quotationDetail.manualInPersonPrintedHandover}</option>
          </select>
        </label>
      </QuotationActionDialog>

      <QuotationActionDialog
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title={t.quotationDetail.confirmSuperAdminApproval}
        description={
          <>
            {t.quotationDetail.areYouSureYouWant} <strong>{quotation.quotationNumber}</strong> {t.quotationDetail.forATotalOf}{" "}
            <strong>{Number(quotation.totalAmount).toFixed(3)} {quotation.currency}</strong>?
          </>
        }
        confirmLabel={t.quotationDetail.confirmApproval}
        confirmClassName="bg-primary hover:bg-primary-hover"
        confirmDisabled={loadingAction === "approve"}
        onConfirm={handleApprove}
      />

      <QuotationActionDialog
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={t.quotationDetail.rejectQuotation}
        description={t.quotationDetail.provideFeedbackOnWhyThis}
        confirmLabel={t.quotationDetail.confirmRejection}
        confirmClassName="bg-red-600 hover:bg-red-700"
        confirmDisabled={!rejectReason.trim() || loadingAction === "reject"}
        onConfirm={handleReject}
      >
        <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
          {t.quotationDetail.rejectionReason}
          <textarea
            rows={3}
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t.quotationDetail.eGDiscountExceedsAllowed}
            className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white mt-1"
          />
        </label>
      </QuotationActionDialog>

      <QuotationActionDialog
        open={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        title={t.quotationDetail.recordClientAcceptance}
        description={t.quotationDetail.enterReferenceEvidenceOfClient}
        confirmLabel={t.quotationDetail.recordAcceptance}
        confirmClassName="bg-teal-700 hover:bg-teal-800"
        confirmDisabled={loadingAction === "accept"}
        onConfirm={handleAccept}
      >
        <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
          {t.quotationDetail.acceptanceReferenceNotes}
          <input
            type="text"
            value={acceptanceEvidence}
            onChange={(e) => setAcceptanceEvidence(e.target.value)}
            placeholder={t.quotationDetail.eGSignedPoPo}
            className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white mt-1"
          />
        </label>
      </QuotationActionDialog>
    </div>
  );
}
