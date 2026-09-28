"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CRMContact, Invoice } from "@ishoot/database/types";
import { Card, Button, Input, Select, CurrencyDisplay } from "@ishoot/ui";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  Receipt,
  FileText,
  AlertCircle,
  ExternalLink,
  UploadCloud,
  Loader2,
  Trash2,
  ShieldCheck,
  FileCheck,
  FolderArchive,
} from "lucide-react";
import {
  createPaymentAction,
  getUnpaidInvoicesByClientAction,
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "payment");
      formData.append("entityId", "pending");
      formData.append(
        "customName",
        type === "cheque"
          ? `Cheque Copy - ${file.name}`
          : type === "bank_receipt"
            ? `Bank Statement Slip - ${file.name}`
            : `Payment Proof - ${file.name}`,
      );
      formData.append("documentType", type);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
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
      alert(err.message || "Failed to upload document");
    } finally {
      if (type === "cheque") setUploadingCheque(false);
      else if (type === "bank_receipt") setUploadingBankReceipt(false);
      else setUploadingProof(false);
    }
  };

  // Dynamically fetch fresh client invoices whenever selectedClientId changes
  React.useEffect(() => {
    if (!selectedClientId) return;

    let active = true;
    async function loadClientInvoices() {
      setFetchingInvoices(true);
      try {
        const res = await getUnpaidInvoicesByClientAction(selectedClientId);
        if (active && res.success && res.invoices) {
          setInvoices((prev) => {
            // Merge or update with fresh invoices
            const map = new Map<string, Invoice>();
            prev.forEach((inv) => map.set(inv.id, inv));
            res.invoices.forEach((inv: Invoice) => map.set(inv.id, inv));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.error("Error loading client invoices:", err);
      } finally {
        if (active) setFetchingInvoices(false);
      }
    }

    loadClientInvoices();
    return () => {
      active = false;
    };
  }, [selectedClientId]);

  // Filter invoices belonging to selected client
  const clientInvoices = React.useMemo(() => {
    if (!selectedClientId) return invoices;
    return invoices.filter(
      (inv) =>
        inv.contact_id === selectedClientId ||
        inv.deal?.contact_id === selectedClientId,
    );
  }, [selectedClientId, invoices]);

  // Find the selected invoice object for detailed summary
  const selectedInvoice = React.useMemo(() => {
    return invoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [invoices, selectedInvoiceId]);

  // When invoice changes, default payment amount to amount_due or total_amount
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const found = invoices.find((i) => i.id === invId);
    if (found) {
      setAmount(found.amount_due > 0 ? found.amount_due : found.total_amount);
    }
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
        "Cheque payments require uploading both documents: (1) Cheque Copy and (2) Bank Statement Transfer Slip before issuing a receipt.",
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

      router.push("/dashboard/payments");
    } catch (err: any) {
      console.error("Failed to record payment:", err);
      setFormError(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/payments">
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1 & Step 2 Client and Invoice Association */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Step 1: Select Client */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                1. Select Client (Customer) *
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
                <label>2. Select Related Invoice *</label>
                {fetchingInvoices && (
                  <span className="text-[10px] text-[#09937F] font-mono animate-pulse">
                    Refreshing invoices...
                  </span>
                )}
              </div>
              <Select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                required
                disabled={!selectedClientId || clientInvoices.length === 0}
              >
                <option value="">
                  {!selectedClientId
                    ? "-- Select a client first --"
                    : clientInvoices.length === 0
                    ? "-- No invoices found for this client --"
                    : "-- Choose an invoice --"}
                </option>
                {clientInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} • Total: {Number(inv.total_amount).toFixed(3)} {inv.currency} (Due: {Number(inv.amount_due).toFixed(3)}) [{inv.status}]
                  </option>
                ))}
              </Select>
              {selectedClientId && clientInvoices.length === 0 && !fetchingInvoices && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  This client currently has no invoices on file.{" "}
                  <Link
                    href={`/dashboard/invoices/new?clientId=${selectedClientId}`}
                    className="underline font-bold text-[#09937F]"
                  >
                    Create an invoice first
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Invoice Financial Preview Callout */}
          {selectedInvoice && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs animate-fade-in">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Invoice Number</span>
                <Link
                  href={`/dashboard/invoices/${selectedInvoice.id}`}
                  target="_blank"
                  className="font-mono font-bold text-[#09937F] hover:underline flex items-center gap-1"
                >
                  <span>{selectedInvoice.invoice_number}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Total Invoiced</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  <CurrencyDisplay
                    amount={selectedInvoice.total_amount}
                    currency={selectedInvoice.currency}
                  />
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Balance Currently Due</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  <CurrencyDisplay
                    amount={selectedInvoice.amount_due}
                    currency={selectedInvoice.currency}
                  />
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Balance After Payment</span>
                <span className={`font-mono font-bold ${remainingBalance === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  <CurrencyDisplay
                    amount={remainingBalance}
                    currency={selectedInvoice.currency}
                  />
                  {remainingBalance === 0 && (
                    <span className="text-[10px] ms-1 text-emerald-500">(Settled)</span>
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
                className="font-mono text-lg font-bold text-[#09937F]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Payment Date
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
                <option value="bank_transfer">Bank Transfer (تحويل بنكي)</option>
                <option value="cash">Cash (نقدي)</option>
                <option value="cheque">Cheque (شيك)</option>
                <option value="card">Credit / Debit Card (بطاقة)</option>
                <option value="online">Online Gateway / BenefitPay (إلكتروني)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Reference Number / Transaction ID
              </label>
              <Input
                placeholder="TRX-984210"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Notes & Allocation
              </label>
              <Input
                placeholder="Advance payment for production..."
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
                      Required Cheque Settlement Documents / مستندات تسوية الشيك (2 Documents)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-bold">
                    Mandatory for Cheques
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Document 1: Cheque Copy */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#152B27]/20 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#014842] dark:text-[#7de0d1]" />
                        <span>1. Cheque Copy / صورة الشيك *</span>
                      </label>
                      <span className="text-[10px] text-rose-500 font-bold">Required</span>
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
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              ✓ Uploaded & ready to archive
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
                            {uploadingCheque ? "Uploading cheque..." : "Click or drop Cheque Scan"}
                          </p>
                          <p className="text-[10px] text-slate-400">PDF, PNG, JPG (Front & back)</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document 2: Bank Transfer Slip / Statement Advice */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#152B27]/20 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#014842] dark:text-[#7de0d1]" />
                        <span>2. Bank Transfer Slip / كشف الحساب *</span>
                      </label>
                      <span className="text-[10px] text-rose-500 font-bold">Required</span>
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
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              ✓ Uploaded & ready to archive
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
                            {uploadingBankReceipt ? "Uploading statement..." : "Click or drop Bank Slip"}
                          </p>
                          <p className="text-[10px] text-slate-400">PDF, PNG, JPG (Deposit/Statement)</p>
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
                    <span>Proof of Payment / إيصال التحويل أو سند الدفع (Optional Archive Proof)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Saved to Archive Vault</span>
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
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          ✓ Ready to archive with payment
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
                        {uploadingProof ? "Uploading proof..." : "Click or drag BenefitPay / Wire Transfer Receipt"}
                      </p>
                      <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 25MB</p>
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
            <Link href="/dashboard/payments">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !selectedInvoiceId || amount <= 0}
              className="gap-2 shadow-sm hover:shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? "Recording..." : "Record Payment & Issue Receipt"}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
