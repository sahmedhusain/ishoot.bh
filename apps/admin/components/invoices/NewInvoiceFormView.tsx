"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type {
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
import { Card, Input, Select, Button } from "@ishoot/ui";
import {
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { createInvoiceAction } from "../../app/actions/finance";

interface NewInvoiceFormViewProps {
  initialContacts: CRMContact[];
  company: CompanySettings | null;
}

export function NewInvoiceFormView({
  initialContacts,
  company,
}: NewInvoiceFormViewProps) {
  const router = useRouter();
  const { t, locale, isRTL } = useAdminLocale();

  const [contacts] = React.useState<CRMContact[]>(initialContacts);
  const [submitting, setSubmitting] = React.useState(false);

  const [selectedContactId, setSelectedContactId] = React.useState(
    initialContacts.length > 0 ? initialContacts[0].id : "",
  );
  const [currency, setCurrency] = React.useState<SupportedCurrency>(
    (company?.default_currency as SupportedCurrency) || "BHD",
  );
  const [language, setLanguage] = React.useState<"en" | "ar">(
    locale === "ar" ? "ar" : "en",
  );
  const [issueDate, setIssueDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = React.useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  );
  const [notesEn, setNotesEn] = React.useState("");
  const [notesAr, setNotesAr] = React.useState("");

  const [lineItems, setLineItems] = React.useState<InvoiceLineItem[]>([
    {
      description_en: "",
      description_ar: "",
      quantity: 1,
      unit_price: 0,
      line_total: 0,
    },
  ]);

  const [discountType, setDiscountType] = React.useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [vatEnabled, setVatEnabled] = React.useState<boolean>(
    company?.vat_enabled || false,
  );

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

  const updateLineItem = (
    index: number,
    field: keyof InvoiceLineItem,
    value: any,
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.line_total =
          (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      }
      next[index] = item;
      return next;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totals = React.useMemo(() => {
    return calculateInvoiceTotals(
      lineItems,
      discountType,
      discountValue,
      vatEnabled,
      company?.vat_percentage || 10,
      currency,
    );
  }, [lineItems, discountType, discountValue, vatEnabled, company, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || lineItems.length === 0) return;
    setSubmitting(true);

    try {
      const res = await createInvoiceAction({
        contact_id: selectedContactId,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        language,
        notes_en: notesEn || undefined,
        notes_ar: notesAr || undefined,
        discount_type: discountType,
        discount_value: discountValue,
        vat_enabled: vatEnabled,
        vat_percentage: company?.vat_percentage || 10,
        line_items: lineItems.map((li) => ({
          description_en: li.description_en || "Service",
          description_ar: li.description_ar || undefined,
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
        })),
      });

      if (res.invoice?.id) {
        router.push(`/dashboard/invoices/${res.invoice.id}`);
      }
    } catch (err) {
      console.error("Error creating invoice:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-xs text-[#9EADA9] hover:text-[#09937F] transition-colors font-medium"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.actions.backToInvoices}</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          {t.invoiceForm.title}
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">{t.invoiceForm.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            {t.invoiceForm.particulars}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[#9EADA9]">
                {t.finance.client} *
              </label>
              <Select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                required
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} (${c.full_name})` : c.full_name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {t.invoiceForm.currencyLabel}
              </label>
              <Select
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as SupportedCurrency)
                }
              >
                {Object.keys(CURRENCY_CONFIGS).map((code) => {
                  const cfg = CURRENCY_CONFIGS[code as SupportedCurrency];
                  return (
                    <option key={code} value={code}>
                      {code} ({locale === "ar" ? cfg.symbolAr : cfg.symbolEn})
                    </option>
                  );
                })}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {t.invoiceForm.docLangLabel}
              </label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
              >
                <option value="ar">{t.invoiceForm.arabic}</option>
                <option value="en">{t.invoiceForm.english}</option>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[#9EADA9]">
                {t.finance.issueDate}
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[#9EADA9]">
                {t.finance.dueDate}
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="font-mono text-xs"
                required
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {t.invoiceForm.deliverables}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="gap-1.5 text-xs text-[#09937F] border-[#09937F]/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.invoiceForm.addItem}</span>
            </Button>
          </div>

          <div className="space-y-4 pt-2">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#050807] border border-white/5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] text-[#9EADA9]">
                    {t.invoiceForm.descEnLabel}
                  </label>
                  <Input
                    required
                    placeholder={t.invoiceForm.placeholderEn}
                    value={item.description_en}
                    onChange={(e) =>
                      updateLineItem(idx, "description_en", e.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[11px] text-[#9EADA9]">
                    {t.invoiceForm.descArLabel}
                  </label>
                  <Input
                    placeholder={t.invoiceForm.placeholderAr}
                    value={item.description_ar || ""}
                    onChange={(e) =>
                      updateLineItem(idx, "description_ar", e.target.value)
                    }
                    className="text-end font-arabic"
                  />
                </div>

                <div className="md:col-span-1 space-y-1">
                  <label className="text-[11px] text-[#9EADA9]">
                    {t.invoiceForm.qty}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(
                        idx,
                        "quantity",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="font-mono text-center"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] text-[#9EADA9]">
                    {t.invoiceForm.rate} ({currency})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={item.unit_price}
                    onChange={(e) =>
                      updateLineItem(
                        idx,
                        "unit_price",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="font-mono"
                  />
                </div>

                <div className="md:col-span-1 flex items-center justify-end pb-2">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title={t.invoiceForm.removeItem}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-6 p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              {t.invoiceForm.deductionsTitle}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#9EADA9]">
                    {t.finance.discount}
                  </label>
                  <Select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as DiscountType)
                    }
                  >
                    <option value="none">{t.invoiceForm.noDiscount}</option>
                    <option value="percentage">
                      {t.invoiceForm.pctDiscount}
                    </option>
                    <option value="fixed">{t.invoiceForm.fixedDiscount}</option>
                  </Select>
                </div>

                {discountType !== "none" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#9EADA9]">
                      {discountType === "percentage"
                        ? t.invoiceForm.discountPctLabel
                        : `${t.invoiceForm.discountAmtLabel} (${currency})`}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.001"}
                      value={discountValue}
                      onChange={(e) =>
                        setDiscountValue(parseFloat(e.target.value) || 0)
                      }
                      className="font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#050807] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">
                    {vatEnabled
                      ? t.invoiceForm.vatEnabledTitle
                      : t.invoiceForm.vatDisabledTitle}
                  </div>
                  <div className="text-[10px] text-[#9EADA9]">
                    {vatEnabled
                      ? t.invoiceForm.vatEnabledDesc
                      : t.invoiceForm.vatDisabledDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVatEnabled(!vatEnabled)}
                  className={`text-xs px-3 py-1 rounded-lg border font-mono ${
                    vatEnabled
                      ? "bg-[#09937F]/20 text-[#09937F] border-[#09937F]"
                      : "bg-white/5 text-[#9EADA9] border-white/10"
                  }`}
                >
                  {vatEnabled ? t.invoiceForm.active : t.invoiceForm.disabled}
                </button>
              </div>
            </div>
          </Card>

          <Card className="md:col-span-6 p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4 flex flex-col justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#09937F]" />
              <span>{t.invoiceForm.summaryTitle}</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-[#9EADA9]">
                <span>{t.finance.subtotal}:</span>
                <span className="font-mono text-white text-sm">
                  {totals.subtotal.toFixed(3)} {currency}
                </span>
              </div>

              {totals.discountAmount > 0 && (
                <div className="flex items-center justify-between text-[#09937F]">
                  <span>{t.finance.discount}:</span>
                  <span className="font-mono">
                    -{totals.discountAmount.toFixed(3)} {currency}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-[#9EADA9]">
                <span>{t.finance.vat}:</span>
                <span className="font-mono">
                  {totals.vatAmount > 0
                    ? `${totals.vatAmount.toFixed(3)} ${currency}`
                    : "0.000"}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {t.finance.totalAmount}:
                </span>
                <span className="text-xl font-bold font-mono text-[#09937F]">
                  {totals.totalAmount.toFixed(3)} {currency}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full mt-4 shadow-xl shadow-[#09937F]/25 gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting ? t.invoiceForm.submitting : t.actions.newInvoice}
              </span>
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
