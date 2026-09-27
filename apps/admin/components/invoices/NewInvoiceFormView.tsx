"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CRMContact,
  CompanySettings,
  InvoiceLineItem,
  SupportedCurrency,
  DiscountType,
} from "@ishoot/database/types";
import {
  Card,
  Button,
  Input,
  Select,
} from "@ishoot/ui";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  Search,
  Loader2,
  Building,
  User,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { createInvoiceAction } from "../../app/actions/finance";
import { lookupClientAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { CURRENCY_CONFIGS, calculateInvoiceTotals } from "@ishoot/database/types";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";

interface NewInvoiceFormViewProps {
  initialContacts: CRMContact[];
  company: CompanySettings | null;
  preselectedClientId?: string;
}

export function NewInvoiceFormView({
  initialContacts,
  company,
  preselectedClientId,
}: NewInvoiceFormViewProps) {
  const router = useRouter();
  const { t, locale, isRTL } = useAdminLocale();

  const [contacts, setContacts] = React.useState<CRMContact[]>(initialContacts);
  const [submitting, setSubmitting] = React.useState(false);
  const [lookupTerm, setLookupTerm] = React.useState("");
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupMessage, setLookupMessage] = React.useState<string | null>(null);

  const [selectedContactId, setSelectedContactId] = React.useState(
    preselectedClientId || (initialContacts.length > 0 ? initialContacts[0].id : ""),
  );

  const selectedContact = React.useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const handleLookup = async () => {
    if (!lookupTerm.trim()) return;
    setLookupLoading(true);
    setLookupMessage(null);
    try {
      const res = await lookupClientAction(lookupTerm);
      if (res.success && res.contact) {
        const found = res.contact;
        const exists = contacts.some((c) => c.id === found.id);
        if (!exists) {
          setContacts((prev) => [found, ...prev]);
        }
        setSelectedContactId(found.id);
        setLookupMessage(
          `Auto-fetched: ${found.company ? `${found.company} - ` : ""}${found.full_name} (${found.email || found.phone || "Client"})`,
        );
      } else {
        setLookupMessage("No client found matching this email or phone number.");
      }
    } catch (e) {
      console.error(e);
      setLookupMessage("Error executing client lookup.");
    } finally {
      setLookupLoading(false);
    }
  };

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
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  );
  const [notesEn, setNotesEn] = React.useState(
    company?.default_invoice_notes_en || "",
  );
  const [notesAr, setNotesAr] = React.useState(
    company?.default_invoice_notes_ar || "",
  );

  const [discountType, setDiscountType] = React.useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [vatEnabled, setVatEnabled] = React.useState(
    company?.tax_registration_status ?? true,
  );

  const [lineItems, setLineItems] = React.useState<InvoiceLineItem[]>([
    {
      description_en: "",
      description_ar: "",
      quantity: 1,
      unit_price: 0,
      line_total: 0,
    },
  ]);

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
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-[#09937F] dark:text-slate-400 dark:hover:text-[#09937F] transition-colors font-medium"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.actions.backToInvoices}</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
          {t.invoiceForm.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.invoiceForm.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Client Selection Card with Auto-Fetch */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.invoiceForm.particulars}
            </h2>
            {selectedContact && (
              <Link
                href={`/dashboard/crm/customers/${selectedContact.id}`}
                target="_blank"
                className="text-xs font-mono text-[#09937F] hover:underline flex items-center gap-1"
              >
                <span>Client Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {/* Quick Auto-Fetch Input */}
            <div className="space-y-2 sm:col-span-2 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{t.finance.client} Quick Lookup (Email / Phone)</span>
                <span className="text-[10px] text-[#09937F] font-mono font-bold bg-[#E6F5F2] dark:bg-[#09937F]/20 px-2 py-0.5 rounded-full">Auto-Fetch</span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter client email or phone..."
                  value={lookupTerm}
                  onChange={(e) => setLookupTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className="gap-1.5 shrink-0"
                >
                  {lookupLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#09937F]" />
                  ) : (
                    <Search className="w-4 h-4 text-[#09937F]" />
                  )}
                  <span>Fetch</span>
                </Button>
              </div>
              {lookupMessage && (
                <p className={`text-[11px] font-medium ${lookupMessage.includes("Found") || lookupMessage.includes("Auto-fetched") ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {lookupMessage}
                </p>
              )}
            </div>

            {/* Client Autocomplete Selector */}
            <div className="sm:col-span-2">
              <ClientAutocomplete
                initialContacts={contacts}
                selectedContactId={selectedContactId}
                onSelect={(c) => {
                  setSelectedContactId(c ? c.id : "");
                }}
                label={`${t.finance.client}`}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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

        {/* Deliverables / Line Items Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
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
                className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
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
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
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

        {/* Deductions & Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-6 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-3">
              {t.invoiceForm.deductionsTitle}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {vatEnabled
                      ? t.invoiceForm.vatEnabledTitle
                      : t.invoiceForm.vatDisabledTitle}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {vatEnabled
                      ? t.invoiceForm.vatEnabledDesc
                      : t.invoiceForm.vatDisabledDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVatEnabled(!vatEnabled)}
                  className={`text-xs px-3 py-1 rounded-lg border font-mono transition-colors ${
                    vatEnabled
                      ? "bg-[#09937F]/20 text-[#09937F] border-[#09937F]"
                      : "bg-slate-200/50 text-slate-500 border-slate-300 dark:bg-white/5 dark:text-slate-400 dark:border-white/10"
                  }`}
                >
                  {vatEnabled ? t.invoiceForm.active : t.invoiceForm.disabled}
                </button>
              </div>
            </div>
          </Card>

          <Card className="md:col-span-6 p-6 space-y-4 flex flex-col justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#09937F]" />
              <span>{t.invoiceForm.summaryTitle}</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>{t.finance.subtotal}:</span>
                <span className="font-mono text-slate-900 dark:text-white text-sm font-semibold">
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

              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>{t.finance.vat}:</span>
                <span className="font-mono font-medium">
                  {totals.vatAmount > 0
                    ? `${totals.vatAmount.toFixed(3)} ${currency}`
                    : "0.000"}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
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
              className="w-full mt-4 gap-2"
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
