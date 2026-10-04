"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CRMContact,
  CompanySettings,
  SupportedCurrency,
  getCurrencyDisplayLabel,
  DiscountType,
  ServiceItem,
} from "@ishoot/database/types";
import { Card, Button } from "@ishoot/ui";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  Globe2,
  Layers,
} from "lucide-react";
import { createQuotationAction } from "../../app/actions/quotations";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";
import { toast } from "sonner";

interface LineItemDraft {
  serviceId?: string | null;
  descriptionEn: string;
  descriptionAr: string;
  quantity: number;
  unitPrice: number;
}

interface NewQuotationFormViewProps {
  initialContacts: CRMContact[];
  company: CompanySettings | null;
  services?: ServiceItem[];
  preselectedClientId?: string;
  dealId?: string;
  inquiryId?: string;
  /** Units of each quotable currency per 1 BHD, from the server's rate source. */
  fxRates: Record<string, number>;
}

export function NewQuotationFormView({
  initialContacts,
  company,
  services = [],
  preselectedClientId,
  dealId,
  inquiryId,
  fxRates,
}: NewQuotationFormViewProps) {
  const router = useRouter();
  const { isRTL, t } = useAdminLocale();
  const qfT = t.quotationForm;

  const [contacts, setContacts] = React.useState<CRMContact[]>(initialContacts);
  const [submitting, setSubmitting] = React.useState(false);

  const [selectedContactId, setSelectedContactId] = React.useState(
    preselectedClientId || (initialContacts.length > 0 ? initialContacts[0].id : ""),
  );

  const selectedContact = React.useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  // Quotation Meta
  const [currency, setCurrency] = React.useState<SupportedCurrency>("BHD");
  const [language, setLanguage] = React.useState<"en" | "ar">("ar");
  const [validUntilDays, setValidUntilDays] = React.useState(30);

  // FX Buffer State (3% default company policy for non-BHD)
  const isNonBhd = currency !== "BHD";
  const currentRawRate = fxRates[currency] ?? 1;
  const fxMarginPercent = 3.0;
  const effectiveRate = isNonBhd
    ? Math.round(currentRawRate * (1 + fxMarginPercent / 100) * 1000000) / 1000000
    : 1.0;

  // VAT & Discount
  const [vatEnabled, setVatEnabled] = React.useState<boolean>(company?.vat_enabled ?? true);
  const vatPercentage = company?.vat_percentage ?? 10;
  const [discountType, setDiscountType] = React.useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);

  // Bilingual Terms
  const [termsEn, setTermsEn] = React.useState<string>(
    "1. Validity: 30 days from issue date.\n2. Payment terms: 50% advance upon contract signing, 50% upon final delivery.\n3. Revisions: Up to 2 rounds included.",
  );
  const [termsAr, setTermsAr] = React.useState<string>(
    "1. الصلاحية: 30 يوماً من تاريخ الإصدار.\n2. شروط الدفع: 50% دفعة مقدمة عند توقيع العقد، و 50% عند التسليم النهائي.\n3. التعديلات: تتضمن جولتين من المراجعة والتعديل.",
  );

  // Line items
  const [lineItems, setLineItems] = React.useState<LineItemDraft[]>([
    {
      serviceId: services.length > 0 ? services[0].id : null,
      descriptionEn: services.length > 0 ? services[0].name_en : "Production Services",
      descriptionAr: services.length > 0 ? services[0].name_ar : "خدمات الإنتاج والتصوير",
      quantity: 1,
      unitPrice: 150,
    },
  ]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        serviceId: null,
        descriptionEn: "",
        descriptionAr: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItemDraft, value: unknown) => {
    setLineItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, [field]: value };
      }),
    );
  };

  const handleSelectService = (index: number, serviceId: string) => {
    const s = services.find((serv) => serv.id === serviceId);
    if (!s) return;
    setLineItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          serviceId: s.id,
          descriptionEn: s.name_en,
          descriptionAr: s.name_ar,
        };
      }),
    );
  };

  // Pricing calculations
  const subtotal = React.useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [lineItems]);

  const discountAmount = React.useMemo(() => {
    if (discountType === "percentage") {
      return Math.round(subtotal * (discountValue / 100) * 1000) / 1000;
    }
    if (discountType === "fixed") {
      return Math.min(subtotal, Math.round(discountValue * 1000) / 1000);
    }
    return 0;
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const vatAmount = vatEnabled
    ? Math.round(taxableAmount * (vatPercentage / 100) * 1000) / 1000
    : 0;
  const totalAmount = Math.round((taxableAmount + vatAmount) * 1000) / 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) {
      toast.error(isRTL ? "يرجى تحديد العميل أولاً" : "Please select a client first");
      return;
    }

    if (lineItems.length === 0 || lineItems.some((l) => !l.descriptionEn.trim())) {
      toast.error(
        isRTL
          ? "يرجى التأكد من إدخال وصف لجميع البنود"
          : "Please ensure all line items have descriptions",
      );
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(
      isRTL ? "جارٍ حفظ مسودة عرض السعر..." : "Saving quotation draft...",
    );

    try {
      const res = await createQuotationAction({
        clientId: selectedContactId,
        dealId: dealId || null,
        inquiryId: inquiryId || null,
        validUntilDays,
        currency,
        language,
        vatEnabled,
        vatPercentage,
        discountType,
        discountValue,
        termsEn,
        termsAr,
        lineItems: lineItems.map((li, idx) => ({
          serviceId: li.serviceId || null,
          descriptionEn: li.descriptionEn,
          descriptionAr: li.descriptionAr || null,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          sortOrder: idx,
        })),
      });

      if (res.success && res.quotation) {
        toast.success(
          isRTL
            ? `تم إنشاء عرض السعر بنجاح (${res.quotation.quotationNumber})`
            : `Quotation ${res.quotation.quotationNumber} created successfully`,
          { id: toastId },
        );
        router.push(`/dashboard/quotations/${res.quotation.id}`);
      } else {
        toast.error("Failed to create quotation", { id: toastId });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] dark:border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotations"
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </Link>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#09937F] font-medium">
              {qfT.commercialEngine}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {qfT.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotations"
            className="px-4 py-2 text-sm font-medium rounded-md border border-[#EAEAEA] dark:border-white/10 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {qfT.cancel}
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#014842] hover:bg-[#013833] text-white px-5 py-2 rounded-md font-medium text-sm active:scale-[0.98] transition-all shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? qfT.saving : qfT.saveDraft}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection Card */}
          <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] dark:border-white/10 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#09937F]" />
                {qfT.clientLabel}
              </h2>
            </div>

            <div className="space-y-4">
              <ClientAutocomplete
                contacts={contacts}
                selectedContactId={selectedContactId}
                onSelect={(contact) => {
                  if (contact) {
                    setSelectedContactId(contact.id);
                    if (!contacts.some((c) => c.id === contact.id)) {
                      setContacts((prev) => [contact, ...prev]);
                    }
                  } else {
                    setSelectedContactId("");
                  }
                }}
              />

              {selectedContact && (
                <div className="p-4 bg-slate-50 dark:bg-neutral-900/50 rounded-md border border-[#EAEAEA] dark:border-white/10 text-xs space-y-1 text-slate-600 dark:text-neutral-400">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">
                    {selectedContact.company || selectedContact.full_name}
                  </div>
                  <div>Email: {selectedContact.email || "N/A"}</div>
                  <div>Phone: {selectedContact.phone || "N/A"}</div>
                  {selectedContact.vat_number && <div>VAT / Tax ID: {selectedContact.vat_number}</div>}
                </div>
              )}
            </div>
          </Card>

          {/* Line Items Card */}
          <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] dark:border-white/10 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#09937F]" />
                {qfT.scopeTitle}
              </h2>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#09937F] hover:text-[#014842] dark:hover:text-[#7de0d1] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {qfT.addItem}
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50/50 dark:bg-neutral-900/30 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Item #{index + 1}</span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {services.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Pre-populate from Service Catalog
                      </label>
                      <select
                        value={item.serviceId || ""}
                        onChange={(e) => handleSelectService(index, e.target.value)}
                        className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-1.5 text-slate-800 dark:text-neutral-200"
                      >
                        <option value="">-- Custom item --</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name_en} / {s.name_ar}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                        {qfT.descEn} *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.descriptionEn}
                        onChange={(e) => updateLineItem(index, "descriptionEn", e.target.value)}
                        placeholder="e.g. Commercial Video Production"
                        className="w-full text-sm rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                        {qfT.descAr}
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={item.descriptionAr}
                        onChange={(e) => updateLineItem(index, "descriptionAr", e.target.value)}
                        placeholder="مثال: تصوير وإنتاج إعلان تجاري"
                        className="w-full text-sm rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {qfT.qty}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", Math.max(1, Number(e.target.value)))}
                        className="w-full text-sm font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-1.5 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {qfT.rate} ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, "unitPrice", Number(e.target.value))}
                        className="w-full text-sm font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-1.5 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {qfT.subtotal} ({currency})
                      </label>
                      <div className="text-sm font-mono font-semibold py-2 px-3 bg-slate-100 dark:bg-neutral-800 rounded-md text-slate-900 dark:text-white">
                        {(item.quantity * item.unitPrice).toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Terms & Conditions */}
          <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
              {qfT.termsTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.termsEn}
                </label>
                <textarea
                  rows={4}
                  value={termsEn}
                  onChange={(e) => setTermsEn(e.target.value)}
                  className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] p-3 text-slate-800 dark:text-neutral-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.termsAr}
                </label>
                <textarea
                  rows={4}
                  dir="rtl"
                  value={termsAr}
                  onChange={(e) => setTermsAr(e.target.value)}
                  className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] p-3 text-slate-800 dark:text-neutral-200"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Financial Parameters & FX Breakdown */}
        <div className="space-y-6">
          {/* Settings & Currency */}
          <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-2">
              {isRTL ? "الإعدادات والسياسات" : "Parameters & Policy"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.currencyLabel}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                  className="w-full text-sm font-medium rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-2 text-slate-900 dark:text-white"
                >
                  {["BHD", ...Object.keys(fxRates)].map((code) => (
                    <option key={code} value={code}>
                      {getCurrencyDisplayLabel(code as SupportedCurrency, isRTL ? "ar" : "en")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.validityLabel}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={validUntilDays}
                    onChange={(e) => setValidUntilDays(Number(e.target.value))}
                    className="w-24 text-sm font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500">{qfT.days}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.docLangLabel}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
                  className="w-full text-sm rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="ar">العربية (Arabic Primary)</option>
                  <option value="en">English (English Primary)</option>
                </select>
              </div>
            </div>

            {/* 3% FX Margin Indicator */}
            {isNonBhd && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-900/50 space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5" />
                    <span>{qfT.fxNoticeTitle}</span>
                  </div>
                  <span className="font-mono text-[11px]">
                    1 BHD = {currentRawRate.toFixed(4)} → {effectiveRate.toFixed(4)} {currency}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  {qfT.fxNoticeDesc}
                </p>
              </div>
            )}
          </Card>

          {/* VAT & Discounts */}
          <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-2">
              {qfT.discountsTaxesTitle}
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-900 dark:text-white">{qfT.vatTitle}</div>
                  <div className="text-[11px] text-slate-500">{vatEnabled ? qfT.vatEnabled : qfT.vatDisabled}</div>
                </div>
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#09937F] focus:ring-[#09937F]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.discountType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-2 py-1.5 text-slate-800 dark:text-neutral-200"
                  >
                    <option value="none">{qfT.noDiscount}</option>
                    <option value="percentage">{qfT.pctDiscount}</option>
                    <option value="fixed">{qfT.fixedDiscount} ({currency})</option>
                  </select>
                  {discountType !== "none" && (
                    <input
                      type="number"
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.001"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder={discountType === "percentage" ? qfT.discountPctLabel : qfT.discountAmtLabel}
                      className="text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-white dark:bg-[#111] px-2 py-1.5 text-slate-800 dark:text-neutral-200"
                    />
                  )}
                </div>
                {discountType !== "none" && discountValue > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    {qfT.discountThresholdWarning}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Real-time Summary Card */}
          <Card className="p-6 bg-[#014842] text-white rounded-lg space-y-4 shadow-sm">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#7de0d1]">
              {qfT.summaryTitle}
            </h2>

            <div className="space-y-2 text-xs border-b border-white/20 pb-3">
              <div className="flex justify-between">
                <span className="text-white/80">{qfT.subtotal}</span>
                <span className="font-mono font-medium">{subtotal.toFixed(3)} {currency}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-amber-200">
                  <span>{qfT.discount}</span>
                  <span className="font-mono font-medium">-{discountAmount.toFixed(3)} {currency}</span>
                </div>
              )}
              {vatEnabled && (
                <div className="flex justify-between text-white/80">
                  <span>{qfT.vat}</span>
                  <span className="font-mono font-medium">+{vatAmount.toFixed(3)} {currency}</span>
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-semibold">{qfT.total}</span>
              <span className="text-xl font-bold font-mono text-[#7de0d1]">
                {totalAmount.toFixed(3)} {currency}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
