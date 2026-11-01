"use client";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { formatMessage } from "@platform/locales";
import { useCompanyVat } from "../../hooks/useCompanyVat";

import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CRMContact,
  CompanySettings,
  getCurrencyDisplayLabel,
  DiscountType,
  ServiceItem,
} from "@platform/database/types";
import { Select, Card, Button } from "@platform/ui";
import {
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { createQuotationAction } from "../../app/actions/quotations";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";
import { toast } from "sonner";
import { PageHeader } from "../layout/PageHeader";

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
  discountLimit = null,
  alwaysNeedsApproval = false,
  salesPeople = [],
  currentUserId,
}: NewQuotationFormViewProps) {
  const router = useRouter();
  const { isArabic, t, locale } = useAdminLocale();
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
  const currency = company?.default_currency ?? "";
  const [language, setLanguage] = React.useState<"en" | "ar">("ar");
  const [validUntilDays, setValidUntilDays] = React.useState(30);
  const [salesOwnerId, setSalesOwnerId] = React.useState(currentUserId ?? "");
  // VAT & Discount
  // VAT follows the company registration only; quotations never toggle it.

  const vatEnabled = company?.vat_enabled ?? false;
  const vatPercentage = vatEnabled ? Number(company?.vat_percentage ?? 10) : 0;
  const [discountType, setDiscountType] = React.useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);

  // Bilingual Terms
  const [termsEn, setTermsEn] = React.useState<string>(
    company?.terms_en ?? "",
  );
  const [termsAr, setTermsAr] = React.useState<string>(
    company?.terms_ar ?? "",
  );

  // Line items
  const [lineItems, setLineItems] = React.useState<LineItemDraft[]>([
    {
      serviceId: services.length > 0 ? services[0].id : null,
      descriptionEn: services.length > 0 ? services[0].name_en : "",
      descriptionAr: services.length > 0 ? services[0].name_ar : "",
      quantity: 1,
      unitPrice: services.length > 0 ? Number(services[0].default_rate) || 0 : 0,

    },
  ]);

  const markSaved = useUnsavedChanges({ selectedContactId, currency, language, validUntilDays, salesOwnerId, discountType, discountValue, termsEn, termsAr, lineItems });

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

          unitPrice: Number(s.default_rate) || 0,
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
          formatMessage(t.newQuotationForm.createdWithNumber, { number: res.quotation.quotationNumber }),
          { id: toastId },
        );
        if (!markSaved()) return;
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
    <form inert={submitting} aria-busy={submitting} onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Action bar */}
      <PageHeader
        back={{ href: ROUTES.quotations.list }}
        eyebrow={qfT.commercialEngine}
        actions={<div className="flex items-center gap-3">
          <Link
            href={ROUTES.quotations.list}
            className="px-4 py-2 text-sm font-medium rounded-md border border-outline-variant text-ink-muted dark:text-ink hover:bg-surface-raised dark:hover:bg-surface-raised transition-colors"
          >
            {qfT.cancel}
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-5 py-2 rounded-md font-medium text-sm active:scale-[0.98] transition-all shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? qfT.saving : qfT.saveDraft}</span>
          </Button>
        </div>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection Card */}
          <Card className="p-6 bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono flex items-center gap-2">
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
                <div className="p-4 bg-surface-raised dark:bg-surface-raised/50 rounded-md border border-outline-variant text-xs space-y-1 text-ink-muted">
                  <div className="font-semibold text-ink text-sm">
                    {selectedContact.company || selectedContact.full_name}
                  </div>
                  <div>{t.copy.emailLabel}<bdi dir="ltr">{selectedContact.email || t.copy.notAvailable}</bdi></div>
                  <div>{t.copy.phoneLabel}<bdi dir="ltr">{selectedContact.phone || t.copy.notAvailable}</bdi></div>
                  {selectedContact.vat_number && <div>{t.newQuotationForm.vatTaxId} {selectedContact.vat_number}</div>}
                </div>
              )}
            </div>
          </Card>

          {/* Line Items Card */}
          <Card className="p-6 bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono flex items-center gap-2">
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
                  className="p-4 rounded-md border border-outline-variant bg-surface-raised/50 dark:bg-surface-raised/30 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
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
                    <label>
                      <span className="block text-xs font-medium text-ink-muted mb-1">
                        {t.newQuotationForm.prePopulateFromServiceCatalog}
                      </span>
                      <Select
                        value={item.serviceId || ""}
                        onChange={(e) => handleSelectService(index, e.target.value)}
                        className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised px-3 py-1.5 text-ink"
                      >
                        <option value="">{t.newQuotationForm.customItem}</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name_en} / {s.name_ar}
                          </option>
                        ))}
                      </Select>
                    </label>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label>
                      <span className="block text-xs font-medium text-ink mb-1">
                        {qfT.descEn} *
                      </span>
                      <input
                        type="text"
                        required
                        value={item.descriptionEn}
                        onChange={(e) => updateLineItem(index, "descriptionEn", e.target.value)}
                        placeholder={t.newQuotationForm.eGCommercialVideoProduction}
                        className="w-full text-sm rounded-md border border-outline-variant bg-surface-raised px-3 py-2 text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                       dir="ltr"/>
                    </label>
                    <label>
                      <span className="block text-xs font-medium text-ink mb-1">
                        {qfT.descAr}
                      </span>
                      <input
                        type="text"
                        dir="rtl"
                        value={item.descriptionAr}
                        onChange={(e) => updateLineItem(index, "descriptionAr", e.target.value)}
                        placeholder={t.newQuotationForm.descriptionArPlaceholder}
                        className="w-full text-sm rounded-md border border-outline-variant bg-surface-raised px-3 py-2 text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <label>
                      <span className="block text-xs font-medium text-ink-muted mb-1">
                        {qfT.qty}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", Math.max(1, Number(e.target.value)))}
                        className="w-full text-sm font-mono rounded-md border border-outline-variant bg-surface-raised px-3 py-1.5 text-ink"
                      />
                    </label>
                    <label>
                      <span className="block text-xs font-medium text-ink-muted mb-1">
                        {qfT.rate} ({currency})
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, "unitPrice", Number(e.target.value))}
                        className="w-full text-sm font-mono rounded-md border border-outline-variant bg-surface-raised px-3 py-1.5 text-ink"
                      />
                    </label>
                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">
                        {qfT.subtotal} ({currency})
                      </label>
                      <div className="text-sm font-mono font-semibold py-2 px-3 bg-surface-sunken dark:bg-surface-raised rounded-md text-ink">
                        {(item.quantity * item.unitPrice).toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Terms & Conditions */}
          <Card className="p-6 bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
              {qfT.termsTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label>
                <span className="block text-xs font-medium text-ink-muted mb-1">
                  {qfT.termsEn}
                </span>
                <textarea
                  rows={4}
                  value={termsEn}
                  onChange={(e) => setTermsEn(e.target.value)}
                  className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised p-3 text-ink"
                 dir="ltr"/>
              </label>
              <label>
                <span className="block text-xs font-medium text-ink-muted mb-1">
                  {qfT.termsAr}
                </span>
                <textarea
                  rows={4}
                  dir="rtl"
                  value={termsAr}
                  onChange={(e) => setTermsAr(e.target.value)}
                  className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised p-3 text-ink"
                />
              </label>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Financial parameters */}
        <div className="space-y-6">
          {/* Settings & Currency */}
          <Card className="p-6 bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono border-b border-outline-variant pb-2">
              {t.newQuotationForm.parametersAndPolicy}
            </h2>

            <div className="space-y-3">
              <label>
                <span className="block text-xs font-medium text-ink-muted mb-1">
                  {qfT.currencyLabel}
                </span>
                <Select value={currency} disabled className="w-full"><option value={currency}>{getCurrencyDisplayLabel(currency, locale)}</option></Select>
              </label>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  {qfT.validityLabel}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={validUntilDays}
                    onChange={(e) => setValidUntilDays(Number(e.target.value))}
                    className="w-24 text-sm font-mono rounded-md border border-outline-variant bg-surface-raised px-3 py-1.5 text-ink"
                  />
                  <span className="text-xs text-ink-muted">{qfT.days}</span>
                </div>
              </div>

              <label>
                <span className="block text-xs font-medium text-ink-muted mb-1">
                  {qfT.docLangLabel}
                </span>
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
                  className="w-full text-sm rounded-md border border-outline-variant bg-surface-raised px-3 py-2 text-ink"
                >
                  <option value="ar">{t.invoiceForm.arabic}</option>
                  <option value="en">{t.invoiceForm.english}</option>
                </Select>
              </label>
              {salesPeople.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    {t.attribution.creditedTo}
                  </label>
                  <Select
                    value={salesOwnerId}
                    onChange={(e) => setSalesOwnerId(e.target.value)}
                    className="w-full text-sm rounded-md border border-outline-variant bg-surface-raised px-3 py-2 text-ink"
                  >
                    {currentUserId && !salesPeople.some((p) => p.id === currentUserId) && <option value={currentUserId}>{t.attribution.me}</option>}
                    {salesPeople.map((p) => (
                      <option key={p.id} value={p.id}>{p.id === currentUserId ? `${p.name} (${t.attribution.me})` : p.name}</option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-ink-muted mt-1">{t.attribution.creditHint}</p>
                </div>
              )}
            </div>

          </Card>

          {/* VAT & Discounts */}
          <Card className="p-6 bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono border-b border-outline-variant pb-2">
              {qfT.discountsTaxesTitle}
            </h2>

            <div className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  {qfT.discountType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="text-xs rounded-md border border-outline-variant bg-surface-raised px-2 py-1.5 text-ink"
                  >
                    <option value="none">{qfT.noDiscount}</option>
                    <option value="percentage">{qfT.pctDiscount}</option>
                    <option value="fixed">{qfT.fixedDiscount} ({currency})</option>
                  </Select>
                  {discountType !== "none" && (
                    <input
                      type="number"
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.001"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder={discountType === "percentage" ? qfT.discountPctLabel : qfT.discountAmtLabel}
                      className="text-xs font-mono rounded-md border border-outline-variant bg-surface-raised px-2 py-1.5 text-ink"
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
                      {formatMessage((over ? qfT.discountOverLimit : discountLimit === null ? qfT.discountUnlimited : qfT.discountWithinLimit), { pct: String(pct), limit: String(discountLimit ?? "") })}
                    </p>
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* Real-time Summary Card */}
          <Card className="p-6 bg-primary text-primary-foreground rounded-lg space-y-4 shadow-sm" data-page-section>
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
                  <span>{formatMessage(qfT.vat, { rate: vatPercentage })}</span>
                  <span className="font-mono font-medium">+{vatAmount.toFixed(3)} {currency}</span>
                </div>
              )}
              {otherTaxes.map((tax) => (
                <div key={tax.code} className="flex justify-between text-white/80">
                  <span>{isArabic ? tax.name_ar : tax.name_en} ({tax.rate}%)</span>
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
