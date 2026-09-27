"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type {
  Invoice,
  CRMContact,
  CompanySettings,
  InvoiceLineItem,
  DiscountType,
  SupportedCurrency,
} from "@ishoot/database/types";
import {
  CURRENCY_CONFIGS,
  calculateInvoiceTotals,
} from "@ishoot/database/types";
import {
  Card,
  Input,
  Select,
  Button,
  ConfirmDestructiveModal,
} from "@ishoot/ui";
import {
  Plus,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  updateInvoiceAction,
  voidInvoiceAction,
} from "../../app/actions/finance";

interface InvoiceEditFormViewProps {
  invoice: Invoice;
  initialContacts: CRMContact[];
  company: CompanySettings | null;
}

export function InvoiceEditFormView({
  invoice,
  initialContacts,
  company,
}: InvoiceEditFormViewProps) {
  const router = useRouter();
  const { t, locale } = useAdminLocale();

  const [contacts] = React.useState<CRMContact[]>(initialContacts);
  const [submitting, setSubmitting] = React.useState(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = React.useState(false);

  const [selectedContactId, setSelectedContactId] = React.useState(
    invoice.contact_id || "",
  );
  const [currency, setCurrency] = React.useState<SupportedCurrency>(
    (invoice.currency as SupportedCurrency) || "BHD",
  );
  const [language, setLanguage] = React.useState<"en" | "ar">(
    (invoice.language as "en" | "ar") || "ar",
  );
  const [issueDate, setIssueDate] = React.useState(
    invoice.issue_date
      ? new Date(invoice.issue_date).toISOString().split("T")[0]
      : "",
  );
  const [dueDate, setDueDate] = React.useState(
    invoice.due_date
      ? new Date(invoice.due_date).toISOString().split("T")[0]
      : "",
  );
  const [notesEn, setNotesEn] = React.useState(invoice.notes_en || "");
  const [notesAr, setNotesAr] = React.useState(invoice.notes_ar || "");

  const [lineItems, setLineItems] = React.useState<InvoiceLineItem[]>(
    invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items
      : [
          {
            description_en: "",
            description_ar: "",
            quantity: 1,
            unit_price: 0,
            line_total: 0,
          },
        ],
  );

  const [discountType, setDiscountType] = React.useState<DiscountType>(
    (invoice.discount_type as DiscountType) || "none",
  );
  const [discountValue, setDiscountValue] = React.useState<number>(
    Number(invoice.discount_value) || 0,
  );
  const [vatEnabled, setVatEnabled] = React.useState<boolean>(
    invoice.vat_enabled ?? true,
  );

  const isLocked = invoice.status === "void";

  const totals = calculateInvoiceTotals(
    lineItems,
    discountType,
    discountValue,
    vatEnabled,
    company?.vat_percentage || 10,
    currency,
  );

  const handleLineItemChange = (
    index: number,
    field: keyof InvoiceLineItem,
    val: any,
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: val };

      if (field === "quantity" || field === "unit_price") {
        const qty = field === "quantity" ? parseFloat(val) || 0 : item.quantity;
        const price =
          field === "unit_price" ? parseFloat(val) || 0 : item.unit_price;
        item.line_total = qty * price;
      }

      next[index] = item;
      return next;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description_en: "",
        description_ar: "",
        quantity: 1,
        unit_price: 0,
        line_total: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || submitting) return;

    const validItems = lineItems.filter(
      (item) => item.description_en.trim() !== "",
    );
    if (validItems.length === 0) return;

    setSubmitting(true);

    try {
      await updateInvoiceAction(invoice.id, {
        contact_id: selectedContactId || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        language,
        notes_en: notesEn || undefined,
        notes_ar: notesAr || undefined,
        discount_type: discountType,
        discount_value: discountValue,
        vat_enabled: vatEnabled,
        line_items: validItems.map((item) => ({
          description_en: item.description_en,
          description_ar: item.description_ar || undefined,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });

      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (err) {
      console.error("Failed to update invoice:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async () => {
    try {
      await voidInvoiceAction(invoice.id);
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (err) {
      console.error("Failed to void invoice:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/invoices/${invoice.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[#9EADA9]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.actions?.back || "Back"}</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Edit Invoice — {invoice.invoice_number}
            </h1>
            <p className="text-xs text-[#9EADA9] mt-1">
              Modify line items, discounts, or void invoice under RBAC audit
              logging
            </p>
          </div>
        </div>

        {!isLocked && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoidConfirmOpen(true)}
            className="gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 self-start sm:self-auto"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Void Invoice</span>
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Client & Invoice Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Target Client
              </label>
              <Select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                disabled={isLocked}
              >
                <option value="" className="bg-[#0B1210] text-white">
                  Select Client...
                </option>
                {contacts.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="bg-[#0B1210] text-white"
                  >
                    {c.full_name} {c.company ? `(${c.company})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Currency
              </label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                disabled={isLocked}
              >
                {Object.keys(CURRENCY_CONFIGS).map((code) => (
                  <option
                    key={code}
                    value={code}
                    className="bg-[#0B1210] text-white"
                  >
                    {code} (
                    {CURRENCY_CONFIGS[code as SupportedCurrency].symbolAr})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Document Language
              </label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                disabled={isLocked}
              >
                <option value="ar" className="bg-[#0B1210] text-white">
                  {t.invoiceForm.arabic}
                </option>
                <option value="en" className="bg-[#0B1210] text-white">
                  {t.invoiceForm.english}
                </option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Issue Date *
              </label>
              <Input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                disabled={isLocked}
                className="font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Payment Due Date *
              </label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isLocked}
                className="font-mono"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Line Items & Services
            </h2>
            {!isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="gap-1.5 text-xs text-[#09937F]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deliverable</span>
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-[#9EADA9] mb-1 block">
                      Description (English) *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Cinema Commercial Shoot Day 1"
                      value={item.description_en}
                      onChange={(e) =>
                        handleLineItemChange(
                          idx,
                          "description_en",
                          e.target.value,
                        )
                      }
                      disabled={isLocked}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9EADA9] mb-1 block">
                      Description (Arabic)
                    </label>
                    <Input
                      placeholder={t.invoiceForm.placeholderAr}
                      value={item.description_ar || ""}
                      onChange={(e) =>
                        handleLineItemChange(
                          idx,
                          "description_ar",
                          e.target.value,
                        )
                      }
                      disabled={isLocked}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-[11px] text-[#9EADA9] mb-1 block">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(idx, "quantity", e.target.value)
                      }
                      disabled={isLocked}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9EADA9] mb-1 block">
                      Unit Price ({currency})
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      required
                      value={item.unit_price}
                      onChange={(e) =>
                        handleLineItemChange(idx, "unit_price", e.target.value)
                      }
                      disabled={isLocked}
                      className="font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="text-[11px] text-[#9EADA9] mb-1 block">
                        Line Total
                      </label>
                      <div className="text-sm font-bold text-white font-mono h-10 flex items-center">
                        {(item.quantity * item.unit_price).toFixed(3)}{" "}
                        {currency}
                      </div>
                    </div>
                    {lineItems.length > 1 && !isLocked && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-2 text-[#9EADA9] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Discount & Tax Adjustments
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Discount Type
              </label>
              <Select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                disabled={isLocked}
              >
                <option value="none" className="bg-[#0B1210] text-white">
                  No Discount
                </option>
                <option value="percentage" className="bg-[#0B1210] text-white">
                  Percentage (%)
                </option>
                <option value="fixed" className="bg-[#0B1210] text-white">
                  Fixed Amount ({currency})
                </option>
              </Select>
            </div>

            {discountType !== "none" && (
              <div>
                <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                  Discount Value
                </label>
                <Input
                  type="number"
                  step="0.001"
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(parseFloat(e.target.value) || 0)
                  }
                  disabled={isLocked}
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9] flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  disabled={isLocked}
                  className="w-4 h-4 rounded"
                />
                <span>Enable VAT ({company?.vat_percentage || 10}%)</span>
              </label>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Invoice Terms & Notes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Notes (English)
              </label>
              <textarea
                rows={3}
                placeholder="Payment terms, delivery notes..."
                value={notesEn}
                onChange={(e) => setNotesEn(e.target.value)}
                disabled={isLocked}
                className="w-full bg-[#050807] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#9EADA9]/50 focus:outline-none focus:border-[#09937F]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#9EADA9] mb-1.5 block">
                Notes (Arabic)
              </label>
              <textarea
                rows={3}
                placeholder={t.invoiceForm.placeholderAr}
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                disabled={isLocked}
                className="w-full bg-[#050807] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#9EADA9]/50 focus:outline-none focus:border-[#09937F]"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
            <span className="text-[#9EADA9]">Subtotal</span>
            <span className="font-mono font-bold text-white">
              {totals.subtotal.toFixed(3)} {currency}
            </span>
          </div>

          {discountType !== "none" && (
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
              <span className="text-[#9EADA9]">Discount</span>
              <span className="font-mono font-bold text-rose-400">
                -{totals.discountAmount.toFixed(3)} {currency}
              </span>
            </div>
          )}

          {vatEnabled && (
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
              <span className="text-[#9EADA9]">
                VAT ({company?.vat_percentage || 10}%)
              </span>
              <span className="font-mono font-bold text-[#09937F]">
                +{totals.vatAmount.toFixed(3)} {currency}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm border-t-2 border-[#09937F]/50 pt-3">
            <span className="font-bold text-white">Total Amount</span>
            <span className="font-mono font-bold text-2xl text-[#09937F]">
              {totals.totalAmount.toFixed(3)} {currency}
            </span>
          </div>
        </Card>

        <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
          <Link href={`/dashboard/invoices/${invoice.id}`}>
            <Button type="button" variant="outline" size="sm">
              {t.actions?.cancel || "Cancel"}
            </Button>
          </Link>
          {!isLocked && (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting ? "Saving Changes..." : "Save Invoice Changes"}
              </span>
            </Button>
          )}
        </div>
      </form>

      <ConfirmDestructiveModal
        isOpen={voidConfirmOpen}
        onClose={() => setVoidConfirmOpen(false)}
        onConfirm={handleVoid}
        title="Void Invoice Checkpoint"
        description={`This will permanently void invoice ${invoice.invoice_number}. No further payments can be recorded against this invoice. This action cannot be undone.`}
        confirmLabel="Confirm Void Invoice"
      />
    </div>
  );
}
