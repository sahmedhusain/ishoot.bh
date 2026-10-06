"use client";
import { useCompanyVat } from "../../hooks/useCompanyVat";
import { getCurrencyLabel } from "@ishoot/config/currency";

import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
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
  RefreshCw,
} from "lucide-react";
import type { FxBoardRow } from "@ishoot/database/queries/fx-settlement";
import { createQuotationAction } from "../../app/actions/quotations";
import { refreshExchangeRatesAction } from "../../app/actions/finance";
import { convertFromBhd } from "../../lib/fx-client";
import { adminTranslations } from "../../lib/translations-bilingual";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";
import { toast } from "sonner";

interface LineItemDraft {
  serviceId?: string | null;
  descriptionEn: string;
  descriptionAr: string;
  quantity: number;
  unitPrice: number;
  /** The catalogue price in BHD, kept so the line re-prices when the quotation currency changes. */
  basePriceBhd?: number | null;
}

interface NewQuotationFormViewProps {
  initialContacts: CRMContact[];
  company: CompanySettings | null;
  services?: ServiceItem[];
  preselectedClientId?: string;
  dealId?: string;
  inquiryId?: string;
  /** Units of each quotable currency per 1 BHD, with the rate source. */
  fxBoard: FxBoardRow[];
  /** The issuer's discount limit in % (null = unlimited). */
  discountLimit?: number | null;
  /** The company sends every quotation for approval regardless of discount. */
  alwaysNeedsApproval?: boolean;
  /** People a quotation can be credited to; it defaults to the issuer. */
  salesPeople?: { id: string; name: string }[];
  currentUserId?: string;
}

export function NewQuotationFormView({
  initialContacts,
  company,
  services = [],
  preselectedClientId,
  dealId,
  inquiryId,
  fxBoard: initialFxBoard,
  discountLimit = null,
  alwaysNeedsApproval = false,
  salesPeople = [],
  currentUserId,
}: NewQuotationFormViewProps) {
  const router = useRouter();
  const { isRTL, t, locale } = useAdminLocale();
  const bhd = getCurrencyLabel("BHD", locale === "ar");
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
  const [salesOwnerId, setSalesOwnerId] = React.useState(currentUserId ?? "");
  const [fxBoard, setFxBoard] = React.useState(initialFxBoard);
  const [refreshingFx, setRefreshingFx] = React.useState(false);
  const fxRates = React.useMemo(() => Object.fromEntries(fxBoard.map((row) => [row.currency, row.perBhd])), [fxBoard]);
  const fxRow = fxBoard.find((row) => row.currency === currency);
  const refreshRates = async () => {
    setRefreshingFx(true);
    try {
      const res = await refreshExchangeRatesAction();
      setFxBoard(res.board);
      if (res.live) toast.success(qfT.fxRefreshed);
      else toast.error(qfT.fxRefreshFailed);
    } catch (err) {
      toast.error(errorMessage(err, t, qfT.fxRefreshFailed));
    } finally {
      setRefreshingFx(false);
    }
  };

  // FX Buffer State (3% default company policy for non-BHD)
  const isNonBhd = currency !== "BHD";
  const currentRawRate = fxRates[currency] ?? 1;
  const fxMarginPercent = 3.0;
  const effectiveRate = isNonBhd
    ? Math.round(currentRawRate * (1 + fxMarginPercent / 100) * 1000000) / 1000000
    : 1.0;

  // VAT & Discount
  // VAT follows the company registration only; quotations never toggle it.
  const vatEnabled = company?.vat_enabled ?? false;
  const vatPercentage = vatEnabled ? Number(company?.vat_percentage ?? 10) : 0;
  const [discountType, setDiscountType] = React.useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);

  // Bilingual Terms
  const [termsEn, setTermsEn] = React.useState<string>(
    adminTranslations.en.newQuotationForm.defaultTerms,
  );
  const [termsAr, setTermsAr] = React.useState<string>(
    adminTranslations.ar.newQuotationForm.defaultTerms,
  );

  // Line items
  const [lineItems, setLineItems] = React.useState<LineItemDraft[]>([
    {
      serviceId: services.length > 0 ? services[0].id : null,
      descriptionEn: services.length > 0 ? services[0].name_en : adminTranslations.en.newQuotationForm.productionServices,
      descriptionAr: services.length > 0 ? services[0].name_ar : adminTranslations.ar.newQuotationForm.productionServices,
      quantity: 1,
      unitPrice: services.length > 0 ? Number(services[0].default_rate) || 0 : 0,
      basePriceBhd: services.length > 0 ? Number(services[0].default_rate) || 0 : null,
    },
  ]);

  // Catalogue prices are in BHD: re-price service lines whenever the currency (and so the rate) changes.
  React.useEffect(() => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.basePriceBhd == null ? item : { ...item, unitPrice: convertFromBhd(item.basePriceBhd, effectiveRate, currency) },
      ),
    );
  }, [currency, effectiveRate]);

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
        // A hand-typed price stops following the catalogue rate.
        return { ...item, [field]: value, ...(field === "unitPrice" && { basePriceBhd: null }) };
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
          basePriceBhd: Number(s.default_rate) || 0,
          unitPrice: convertFromBhd(Number(s.default_rate) || 0, effectiveRate, currency),
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
  // Taxes besides VAT from the company registry, charged on the same amount (the server applies the same list).
  const { taxes: registeredTaxes } = useCompanyVat();
  const otherTaxes = registeredTaxes
    .filter((tax) => tax.quotations)
    .map((tax) => ({ ...tax, amount: Math.round(taxableAmount * (tax.rate / 100) * 1000) / 1000 }));
  const otherTaxAmount = otherTaxes.reduce((sum, tax) => sum + tax.amount, 0);
  const totalAmount = Math.round((taxableAmount + vatAmount + otherTaxAmount) * 1000) / 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) {
      toast.error(t.newQuotationForm.pleaseSelectAClientFirst);
      return;
    }

    if (lineItems.length === 0 || lineItems.some((l) => !l.descriptionEn.trim())) {
      toast.error(
        t.newQuotationForm.pleaseEnsureAllLineItems,
      );
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(
      t.newQuotationForm.savingQuotationDraft,
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
        salesOwnerId: salesOwnerId || null,
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
          t.newQuotationForm.createdWithNumber.replace("{number}", res.quotation.quotationNumber),
          { id: toastId },
        );
        router.push(ROUTES.quotations.detail(res.quotation.id));
      } else {
        toast.error(t.newQuotationForm.failedToCreateQuotation, { id: toastId });
      }
    } catch (err: unknown) {
      const msg = errorMessage(err, t, t.newQuotationForm.anUnexpectedErrorOccurred);
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.quotations.list}
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </Link>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-accent font-medium">
              {qfT.commercialEngine}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {qfT.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.quotations.list}
            className="px-4 py-2 text-sm font-medium rounded-md border border-ink/10 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {qfT.cancel}
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-md font-medium text-sm active:scale-[0.98] transition-all shadow-xs"
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
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
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
                <div className="p-4 bg-slate-50 dark:bg-neutral-900/50 rounded-md border border-ink/10 text-xs space-y-1 text-slate-600 dark:text-neutral-400">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">
                    {selectedContact.company || selectedContact.full_name}
                  </div>
                  <div>Email: {selectedContact.email || "N/A"}</div>
                  <div>Phone: {selectedContact.phone || "N/A"}</div>
                  {selectedContact.vat_number && <div>{t.newQuotationForm.vatTaxId} {selectedContact.vat_number}</div>}
                </div>
              )}
            </div>
          </Card>

          {/* Line Items Card */}
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2">
                <Calculator className="w-4 h-4 text-accent" />
                {qfT.scopeTitle}
              </h2>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-primary dark:hover:text-mint transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {qfT.addItem}
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-md border border-ink/10 bg-slate-50/50 dark:bg-neutral-900/30 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{t.newQuotationForm.item}{index + 1}</span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                        title={t.newQuotationForm.removeItem}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {services.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {t.newQuotationForm.prePopulateFromServiceCatalog}
                      </label>
                      <select
                        value={item.serviceId || ""}
                        onChange={(e) => handleSelectService(index, e.target.value)}
                        className="w-full text-xs rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-1.5 text-slate-800 dark:text-neutral-200"
                      >
                        <option value="">{t.newQuotationForm.customItem}</option>
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
                        placeholder={t.newQuotationForm.eGCommercialVideoProduction}
                        className="w-full text-sm rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent"
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
                        placeholder={t.newQuotationForm.descriptionArPlaceholder}
                        className="w-full text-sm rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent"
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
                        className="w-full text-sm font-mono rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-1.5 text-slate-900 dark:text-white"
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
                        className="w-full text-sm font-mono rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-1.5 text-slate-900 dark:text-white"
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
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
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
                  className="w-full text-xs font-mono rounded-md border border-ink/10 bg-white dark:bg-surface-raised p-3 text-slate-800 dark:text-neutral-200"
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
                  className="w-full text-xs font-mono rounded-md border border-ink/10 bg-white dark:bg-surface-raised p-3 text-slate-800 dark:text-neutral-200"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Financial Parameters & FX Breakdown */}
        <div className="space-y-6">
          {/* Settings & Currency */}
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-ink/10 pb-2">
              {t.newQuotationForm.parametersAndPolicy}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.currencyLabel}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                  className="w-full text-sm font-medium rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-2 text-slate-900 dark:text-white"
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
                    className="w-24 text-sm font-mono rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-1.5 text-slate-900 dark:text-white"
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
                  className="w-full text-sm rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="ar">{t.invoiceForm.arabic}</option>
                  <option value="en">{t.invoiceForm.english}</option>
                </select>
              </div>
              {salesPeople.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    {t.attribution.creditedTo}
                  </label>
                  <select
                    value={salesOwnerId}
                    onChange={(e) => setSalesOwnerId(e.target.value)}
                    className="w-full text-sm rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {currentUserId && !salesPeople.some((p) => p.id === currentUserId) && <option value={currentUserId}>{t.attribution.me}</option>}
                    {salesPeople.map((p) => (
                      <option key={p.id} value={p.id}>{p.id === currentUserId ? `${p.name} (${t.attribution.me})` : p.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-muted mt-1">{t.attribution.creditHint}</p>
                </div>
              )}
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
                    1 {bhd} = {currentRawRate.toFixed(4)} → {effectiveRate.toFixed(4)} {currency}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  {qfT.fxNoticeDesc}
                </p>
                {fxRow && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <span>
                      {(fxRow.isFallback ? qfT.fxSourceFallback : qfT.fxSource)
                        .replace("{provider}", fxRow.provider)
                        .replace("{date}", fxRow.effectiveDate)}
                    </span>
                    <button
                      type="button"
                      onClick={refreshRates}
                      disabled={refreshingFx}
                      className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshingFx ? "animate-spin" : ""}`} />
                      {qfT.fxRefresh}
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* VAT & Discounts */}
          <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-ink/10 pb-2">
              {qfT.discountsTaxesTitle}
            </h2>

            <div className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  {qfT.discountType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="text-xs rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-2 py-1.5 text-slate-800 dark:text-neutral-200"
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
                      className="text-xs font-mono rounded-md border border-ink/10 bg-white dark:bg-surface-raised px-2 py-1.5 text-slate-800 dark:text-neutral-200"
                    />
                  )}
                </div>
                {(() => {
                  const pct = subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 100 : 0;
                  const over = discountLimit !== null && pct > discountLimit + 1e-9;
                  if (alwaysNeedsApproval && !over) return <p className="text-[11px] text-ink-muted mt-1">{qfT.approvalAlways}</p>;
                  if (pct <= 0) return null;
                  return (
                    <p className={`text-[11px] mt-1 ${over ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {(over ? qfT.discountOverLimit : discountLimit === null ? qfT.discountUnlimited : qfT.discountWithinLimit)
                        .replace("{pct}", String(pct))
                        .replace("{limit}", String(discountLimit ?? ""))}
                    </p>
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* Real-time Summary Card */}
          <Card className="p-6 bg-primary text-white rounded-lg space-y-4 shadow-sm">
            <h2 className="text-xs font-mono uppercase tracking-widest text-mint">
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
              {otherTaxes.map((tax) => (
                <div key={tax.code} className="flex justify-between text-white/80">
                  <span>{isRTL ? tax.name_ar : tax.name_en} ({tax.rate}%)</span>
                  <span className="font-mono font-medium">+{tax.amount.toFixed(3)} {currency}</span>
                </div>
              ))}
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-semibold">{qfT.total}</span>
              <span className="text-xl font-bold font-mono text-mint">
                {totalAmount.toFixed(3)} {currency}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
