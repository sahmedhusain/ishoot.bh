"use client";
import { ROUTES } from "../../constants/routes";
import { uploadFileDirectly } from "../../lib/upload-client";
import { EntityLookup } from "../shared/EntityLookup";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CRMContact,Invoice } from "@ishoot/database/types";
import { Card,Button,Input,Select,CurrencyDisplay } from "@ishoot/ui";
import {
ArrowLeft,
ArrowRight,
CreditCard,
CheckCircle2,FileText,
AlertCircle,
ExternalLink,
UploadCloud,
Loader2,
Trash2,
ShieldCheck,
FileCheck
} from "lucide-react";
import {
createPaymentAction
} from "../../app/actions/finance";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";

interface NewPaymentFormViewProps {
  initialContacts: CRMContact[];
  initialInvoices: Invoice[];
  preselectedClientId?: string;
}

interface UploadedDocument {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export function NewPaymentFormView({
  initialContacts,
  initialInvoices,
  preselectedClientId,
}: NewPaymentFormViewProps) {
  const router = useRouter();
  const { t, isRTL } = useAdminLocale();

  const [contacts] = React.useState<CRMContact[]>(initialContacts);
  const [invoices, setInvoices] = React.useState<Invoice[]>(initialInvoices);

  const [selectedClientId, setSelectedClientId] = React.useState<string>(
    preselectedClientId || (initialContacts.length > 0 ? initialContacts[0].id : ""),
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string>("");
  const [amount, setAmount] = React.useState<number>(0);
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = React.useState<
    "bank_transfer" | "cheque" | "cash" | "card" | "online"
  >("bank_transfer");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [fetchingInvoices, setFetchingInvoices] = React.useState(false);

  // Upload States
  const [chequeFile, setChequeFile] = React.useState<UploadedDocument | null>(null);
  const [bankReceiptFile, setBankReceiptFile] = React.useState<UploadedDocument | null>(null);
  const [generalProofFile, setGeneralProofFile] = React.useState<UploadedDocument | null>(null);

  const [uploadingCheque, setUploadingCheque] = React.useState(false);
  const [uploadingBankReceipt, setUploadingBankReceipt] = React.useState(false);
  const [uploadingProof, setUploadingProof] = React.useState(false);

  const chequeInputRef = React.useRef<HTMLInputElement>(null);
  const bankReceiptInputRef = React.useRef<HTMLInputElement>(null);
  const proofInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadFile = async (
    file: File,
    type: "cheque" | "bank_receipt" | "general_proof",
  ) => {
    if (type === "cheque") setUploadingCheque(true);
    else if (type === "bank_receipt") setUploadingBankReceipt(true);
    else setUploadingProof(true);

    try {
      const data = await uploadFileDirectly(file, { entityType: "payment", entityId: "pending", documentType: type });
        const res = { ok: true }; // polyfill for following code
      if (!res.ok || !data.success) {
        throw new Error(data.error || t.newPaymentForm.uploadFailed);
      }

      const fileData: UploadedDocument = {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      };

      if (type === "cheque") setChequeFile(fileData);
      else if (type === "bank_receipt") setBankReceiptFile(fileData);
      else setGeneralProofFile(fileData);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err.message || t.newPaymentForm.failedToUploadDocument);
    } finally {
      if (type === "cheque") setUploadingCheque(false);
      else if (type === "bank_receipt") setUploadingBankReceipt(false);
      else setUploadingProof(false);
    }
  };

  const selectedInvoice = invoices.find(i=>i.id===selectedInvoiceId) || null;
  const [error,setError] = React.useState("");
  const requestVersion = React.useRef(0);
  React.useEffect(()=>{requestVersion.current++;setSelectedInvoiceId("");setInvoices([]);},[selectedClientId]);
  const handleInvoiceChange = async (id:string) => {
    const version=++requestVersion.current; setSelectedInvoiceId(id);setError("");
    if(!id){setInvoices([]);return;}
    setFetchingInvoices(true);
    try {
      const response=await fetch(`/api/lookups/invoices?${new URLSearchParams({id,clientId:selectedClientId})}`);
      if(!response.ok) throw Error("Invoice could not be loaded");
      const result=await response.json(), invoice=result.items[0]?.invoice;
      if(!invoice)throw Error("Invoice is no longer payable");
      if(version!==requestVersion.current)return;
      setInvoices([invoice]);setAmount(invoice.amount_due);
    }catch(error){if(version!==requestVersion.current)return;setSelectedInvoiceId("");setInvoices([]);setError(error instanceof Error?error.message:t.newPaymentForm.couldNotLoadInvoice);}
    finally{if(version===requestVersion.current)setFetchingInvoices(false);}
  };

  const remainingBalance = React.useMemo(() => {
    if (!selectedInvoice) return 0;
    return Math.max(0, (selectedInvoice.amount_due || 0) - (Number(amount) || 0));
  }, [selectedInvoice, amount]);

  const [formError, setFormError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedInvoiceId || amount <= 0) return;

    if (paymentMethod === "cheque" && (!chequeFile || !bankReceiptFile)) {
      setFormError(
        t.newPaymentForm.chequePaymentsRequireUploadingBoth,
      );
      return;
    }

    setSaving(true);

    try {
      const attachmentsToSave: UploadedDocument[] = [];
      if (paymentMethod === "cheque") {
        if (chequeFile) attachmentsToSave.push(chequeFile);
        if (bankReceiptFile) attachmentsToSave.push(bankReceiptFile);
      } else {
        if (generalProofFile) attachmentsToSave.push(generalProofFile);
      }

      await createPaymentAction({
        invoice_id: selectedInvoiceId,
        amount: Number(amount),
        payment_date: new Date(paymentDate).toISOString(),
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        proof_attachments:
          attachmentsToSave.length > 0 ? attachmentsToSave : undefined,
      });

      router.push(ROUTES.payments.list);
    } catch (err: any) {
      console.error("Failed to record payment:", err);
      setFormError(err.message || t.newPaymentForm.failedToRecordPayment);
    } finally {
      setSaving(false);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.payments.list}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <BackIcon className="w-4 h-4" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#09937F]" />
            <span>{t.paymentsNew.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.paymentsNew.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-6 sm:p-8 space-y-6">
        {error ? <p role="alert" className="text-red-600">{error}</p> : null}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1 & Step 2 Client and Invoice Association */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Step 1: Select Client */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t.newPaymentView.selectClientLabel} *
              </label>
              <ClientAutocomplete
                initialContacts={contacts}
                selectedContactId={selectedClientId}
                onSelect={(contact) => {
                  setSelectedClientId(contact ? contact.id : "");
                  setSelectedInvoiceId("");
                  setAmount(0);
                }}
                label=""
                required
              />
            </div>

            {/* Step 2: Select Invoice */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label>{t.newPaymentView.selectInvoiceLabel} *</label>
                {fetchingInvoices && (
                  <span className="text-[10px] text-[#09937F]  animate-pulse">
                    {t.newPaymentView.refreshingInvoices}
                  </span>
                )}
              </div>
              <EntityLookup domain="invoices" clientId={selectedClientId} value={selectedInvoiceId} onChange={handleInvoiceChange} />

            </div>
          </div>

          {/* Invoice Financial Preview Callout */}
          {selectedInvoice && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs animate-fade-in">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t.newPaymentView.invoiceNumber}</span>
                <Link
                  href={ROUTES.invoices.detail(selectedInvoice.id)}
                  target="_blank"
                  className=" font-bold text-[#09937F] hover:underline flex items-center gap-1"
                >
                  <span>{selectedInvoice.invoice_number}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t.newPaymentView.totalInvoiced}</span>
                <span className=" font-bold text-slate-800 dark:text-slate-200">
                  <CurrencyDisplay
                    amount={selectedInvoice.total_amount}
                    currency={selectedInvoice.currency}
                  />
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t.newPaymentView.balanceDue}</span>
                <span className=" font-bold text-amber-600 dark:text-amber-400">
                  <CurrencyDisplay
                    amount={selectedInvoice.amount_due}
                    currency={selectedInvoice.currency}
                  />
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">{t.newPaymentView.balanceAfterPayment}</span>
                <span className={` font-bold ${remainingBalance === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  <CurrencyDisplay
                    amount={remainingBalance}
                    currency={selectedInvoice.currency}
                  />
                  {remainingBalance === 0 && (
                    <span className="text-[10px] ms-1 text-emerald-500">{t.newPaymentView.settled}</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Payment Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t.paymentsNew.amountLabel} *
              </label>
              <Input
                type="number"
                required
                min={0.001}
                step={0.001}
                placeholder="0.000"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className=" text-lg font-bold text-[#09937F]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t.newPaymentView.paymentDate}
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t.paymentsNew.methodLabel}
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <option value="bank_transfer">{t.finance.bankTransfer}</option>
                <option value="cash">{t.finance.cash}</option>
                <option value="cheque">{t.finance.cheque}</option>
                <option value="card">{t.finance.card}</option>
                <option value="online">{t.finance.online}</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t.newPaymentView.referenceNumber}
              </label>
              <Input
                placeholder={t.newPaymentView.referenceNumberPlaceholder}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t.newPaymentView.notesAllocation}
              </label>
              <Input
                placeholder={t.newPaymentView.notesAllocationPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Document Attachments & Archive Integration */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-4">
            {paymentMethod === "cheque" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#014842] dark:text-[#7de0d1]" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {t.newPaymentView.chequeSettlementDocsTitle}
                    </h3>
                  </div>
                  <span className="text-[10px]  px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-bold">
                    {t.newPaymentView.mandatoryForCheques}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Document 1: Cheque Copy */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#152B27]/20 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#014842] dark:text-[#7de0d1]" />
                        <span>{t.newPaymentView.chequeCopyLabel} *</span>
                      </label>
                      <span className="text-[10px] text-rose-500 font-bold">{t.newPaymentView.required}</span>
                    </div>

                    <input
                      ref={chequeInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(file, "cheque");
                      }}
                    />

                    {chequeFile ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {chequeFile.fileName}
                            </p>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ">
                              {t.newPaymentView.uploadedReady}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={chequeFile.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                            title="View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setChequeFile(null)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => !uploadingCheque && chequeInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-[#014842] dark:hover:border-[#7de0d1] rounded-xl p-4 text-center cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <div className="w-8 h-8 rounded-full bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1] flex items-center justify-center">
                            {uploadingCheque ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-800 dark:text-neutral-200">
                            {uploadingCheque ? t.newPaymentView.uploadingCheque : t.newPaymentView.clickOrDropCheque}
                          </p>
                          <p className="text-[10px] text-slate-400">{t.newPaymentView.chequeFormats}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document 2: Bank Transfer Slip / Statement Advice */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#152B27]/20 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#014842] dark:text-[#7de0d1]" />
                        <span>{t.newPaymentView.bankSlipLabel} *</span>
                      </label>
                      <span className="text-[10px] text-rose-500 font-bold">{t.newPaymentView.required}</span>
                    </div>

                    <input
                      ref={bankReceiptInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(file, "bank_receipt");
                      }}
                    />

                    {bankReceiptFile ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {bankReceiptFile.fileName}
                            </p>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ">
                              {t.newPaymentView.uploadedReady}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={bankReceiptFile.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                            title="View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setBankReceiptFile(null)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => !uploadingBankReceipt && bankReceiptInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-[#014842] dark:hover:border-[#7de0d1] rounded-xl p-4 text-center cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <div className="w-8 h-8 rounded-full bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1] flex items-center justify-center">
                            {uploadingBankReceipt ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-800 dark:text-neutral-200">
                            {uploadingBankReceipt ? t.newPaymentView.uploadingBankSlip : t.newPaymentView.clickOrDropBankSlip}
                          </p>
                          <p className="text-[10px] text-slate-400">{t.newPaymentView.bankSlipFormats}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-[#014842] dark:text-[#7de0d1]" />
                    <span>{t.newPaymentView.proofOptionalTitle}</span>
                  </label>
                  <span className="text-[10px] text-slate-400 ">{t.newPaymentView.savedToVault}</span>
                </div>

                <input
                  ref={proofInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file, "general_proof");
                  }}
                />

                {generalProofFile ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {generalProofFile.fileName}
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ">
                          {t.newPaymentView.uploadedReady}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={generalProofFile.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                        title="View"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setGeneralProofFile(null)}
                        className="p-1.5 text-rose-500 hover:text-rose-700"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploadingProof && proofInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-[#014842] dark:hover:border-[#7de0d1] rounded-xl p-4 text-center cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="w-8 h-8 rounded-full bg-[#014842]/10 text-[#014842] dark:text-[#7de0d1] flex items-center justify-center">
                        {uploadingProof ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-neutral-200">
                        {uploadingProof ? t.newPaymentView.uploadingProof : t.newPaymentView.clickOrDropProof}
                      </p>
                      <p className="text-[10px] text-slate-400">{t.newPaymentView.proofFormats}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center gap-2.5 text-rose-800 dark:text-rose-200 text-xs font-semibold animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/10">
            <Link href={ROUTES.payments.list}>
              <Button type="button" variant="outline">
                {t.actions.cancel}
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !selectedInvoiceId || amount <= 0}
              className="gap-2 shadow-sm hover:shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? t.newPaymentView.saving : t.newPaymentView.save}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
