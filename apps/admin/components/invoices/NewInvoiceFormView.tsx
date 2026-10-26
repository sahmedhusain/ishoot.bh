"use client";
import { useUnsavedChanges, useNavigationGuard } from "../../hooks/useUnsavedChanges";
import { useConfirmation } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { useCompanyVat } from "../../hooks/useCompanyVat";

import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, businessDateString } from "../../lib/dates";
import type {
  CRMContact,
  CompanySettings,
  InvoiceLineItem,
  SupportedCurrency,
  DiscountType,
  ServiceItem,
  Quotation,
} from "@platform/database/types";
import {
  Card,
  Button,
  Input,
  Select,
} from "@platform/ui";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  FileCheck,
  Receipt,
  Layers,
  ExternalLink,
} from "lucide-react";
import { createInvoiceAction } from "../../app/actions/finance";
import { convertQuotationToInvoiceAction } from "../../app/actions/quotations";
import { convertFromBhd } from "../../lib/fx-client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { CURRENCY_CONFIGS, calculateInvoiceTotals, getCurrencyDisplayLabel } from "@platform/database/types";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";
import { toast } from "sonner";

interface NewInvoiceFormViewProps {
  initialContacts: CRMContact[];
  company: CompanySettings | null;
  services?: ServiceItem[];
  preselectedClientId?: string;
  acceptedQuotations?: Quotation[];
  preselectedQuotation?: Quotation | null;
  /** Deal this invoice bills (from a deal page link). */
  dealId?: string;
  /** Units of each supported currency per 1 BHD; service catalogue prices are in BHD. */
  fxRates?: Record<string, number>;
  /** People an invoice can be credited to; defaults to its quotation's salesperson, else the issuer. */
  salesPeople?: { id: string; name: string }[];
  currentUserId?: string;
}

export function NewInvoiceFormView({
  initialContacts,
  company,
  services = [],
  fxRates = {},
  salesPeople = [],
  currentUserId,
  preselectedClientId,
  acceptedQuotations = [],
  preselectedQuotation,
  dealId,
}: NewInvoiceFormViewProps) {
  const router = useRouter();
  const confirmAction = useConfirmation();
  const { requestNavigation } = useNavigationGuard();
  const { t, locale, isRTL } = useAdminLocale();

  const [contacts, setContacts] = React.useState<CRMContact[]>(initialContacts);
  const [submitting, setSubmitting] = React.useState(false);
  const [convertingQuoteId, setConvertingQuoteId] = React.useState<string | null>(null);

  const [selectedContactId, setSelectedContactId] = React.useState(
    preselectedClientId || (initialContacts.length > 0 ? initialContacts[0].id : ""),
  );

  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string>(
    preselectedQuotation?.id || "",
  );

  const selectedContact = React.useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const [currency, setCurrency] = React.useState<SupportedCurrency>(
    (company?.default_currency as SupportedCurrency) || "BHD",
  );
  const [salesOwnerId, setSalesOwnerId] = React.useState(
    (preselectedQuotation as { salesOwnerId?: string | null } | null | undefined)?.salesOwnerId ?? currentUserId ?? "",
  );
  const [language, setLanguage] = React.useState<"en" | "ar">(
    locale === "ar" ? "ar" : "en",
  );
  const [issueDate, setIssueDate] = React.useState(() => businessDateString());
  const [dueDate, setDueDate] = React.useState(() =>
    businessDateString(addDays(new Date(), company?.payment_terms_days ?? 30)),
  );
  const [selectedDealId, setSelectedDealId] = React.useState<string | undefined>(dealId);
  const [notesEn] = React.useState(
    company?.default_invoice_notes_en || "",
  );
  const [notesAr] = React.useState(
    company?.default_invoice_notes_ar || "",
  );

  const [discountType, setDiscountType] = React.useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  // VAT follows the company registration only; documents never toggle it.
  const [vatEnabled] = React.useState<boolean>(
    company?.vat_enabled ?? false,
  );
  const [vatPercentage] = React.useState<number>(
    company?.vat_percentage ? Number(company.vat_percentage) : 10,
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

  const [quoteInitializing, setQuoteInitializing] = React.useState(!!preselectedQuotation);
  const initializedQuote = React.useRef<string | null>(null);
  const markSaved = useUnsavedChanges({ selectedContactId, selectedQuotationId, currency, salesOwnerId, language, issueDate, dueDate, selectedDealId, notesEn, notesAr, discountType, discountValue, lineItems }, !quoteInitializing);

  // Apply quotation items to the invoice form
  const applyQuotation = React.useCallback(
    (q: any) => {
      if (!q) return;
      setSelectedQuotationId(q.id);
      if (q.dealId) setSelectedDealId(q.dealId);
      // The invoice keeps the quotation's sales credit unless someone changes it on purpose.
      if (q.salesOwnerId) setSalesOwnerId(q.salesOwnerId);

      if (q.clientId) {
        setSelectedContactId(q.clientId);
        if (q.client && !contacts.some((c) => c.id === q.clientId)) {
          setContacts((prev) => [q.client, ...prev]);
        }
      }

      if (q.currency) {
        setCurrency(q.currency as SupportedCurrency);
      }
      if (q.language) {
        setLanguage(q.language === "ar" ? "ar" : "en");
      }
      if (q.discountType) {
        setDiscountType(q.discountType as DiscountType);
      }
      if (q.discountValue !== undefined) {
        setDiscountValue(Number(q.discountValue));
      }

      if (q.lineItems && q.lineItems.length > 0) {
        setLineItems(
          q.lineItems.map((li: any) => ({
            service_id: li.serviceId || undefined,
            description_en: li.descriptionEn || "Service",
            description_ar: li.descriptionAr || "",
            quantity: Number(li.quantity) || 1,
            unit_price: Number(li.unitPrice) || 0,
            line_total:
              Number(li.lineTotal) ||
              (Number(li.quantity) || 1) * (Number(li.unitPrice) || 0),
          })),
        );
      }

      toast.success(
        formatMessage(t.newInvoiceForm.importedFromQuotation, { number: q.quotationNumber }),
      );
    },
    [contacts, t],
  );

  // Initialize from preselected quotation if given
  React.useEffect(() => {
    if (preselectedQuotation && initializedQuote.current !== preselectedQuotation.id) {
      initializedQuote.current = preselectedQuotation.id;
      applyQuotation(preselectedQuotation);
      setQuoteInitializing(false);
    }
  }, [preselectedQuotation, applyQuotation]);

  const handle1ClickConvert = (quoteId: string) => confirmAction({
    title: t.newInvoiceForm.convertConfirmTitle,
    description: t.newInvoiceForm.convertConfirmBody,
    variant: "warning",
    onConfirm: async () => {
      if (!(await requestNavigation())) return;
      setConvertingQuoteId(quoteId);
      const toastId = toast.loading(
        t.newInvoiceForm.convertingQuotationToTaxInvoice,
      );
      try {
        const res = await convertQuotationToInvoiceAction(quoteId);
        if (res.success && res.invoice) {
          toast.success(
            formatMessage(t.newInvoiceForm.createdWithNumber, { number: res.invoice.invoiceNumber }),
            { id: toastId },
          );
          if (!markSaved()) return;
          router.push(ROUTES.invoices.detail(res.invoice.invoiceId));
        } else {
          throw new Error(t.newInvoiceForm.failedToConvertQuotation);
        }
      } catch (err: unknown) {
        toast.error(
          errorMessage(err, t, t.newInvoiceForm.conversionFailed),
          { id: toastId },
        );
        throw err;
      } finally {
        setConvertingQuoteId(null);
      }
    },
  });

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

  // Taxes besides VAT that the company registry adds to new invoices (the server applies the same list).
  const { taxes: registeredTaxes } = useCompanyVat();
  const otherTaxes = React.useMemo(() => registeredTaxes.filter((tax) => tax.invoices), [registeredTaxes]);
  const totals = React.useMemo(() => {
    return calculateInvoiceTotals(
      lineItems,
      discountType,
      discountValue,
      vatEnabled,
      vatPercentage,
      currency,
      otherTaxes,
    );
  }, [lineItems, discountType, discountValue, vatEnabled, vatPercentage, currency, otherTaxes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || lineItems.length === 0) {
      toast.error(t.newInvoiceForm.pleaseSelectAClientAnd);
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading(t.newInvoiceForm.creatingInvoiceDraft);

    try {
      const res = await createInvoiceAction({
        contact_id: selectedContactId,
        deal_id: selectedDealId,
        // Links the source quotation so it is marked converted and cannot be invoiced again.
        quotation_id: selectedQuotationId || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        language,
        notes_en: notesEn || undefined,
        notes_ar: notesAr || undefined,
        discount_type: discountType,
        discount_value: discountValue,
        vat_enabled: vatEnabled,
        vat_percentage: vatPercentage,
        sales_owner_id: salesOwnerId || undefined,
        line_items: lineItems.map((li) => ({
          service_id: li.service_id || undefined,
          description_en: li.description_en || "Service",
          description_ar: li.description_ar || undefined,
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
        })),
      });

      if (res.invoice?.id) {
        toast.success(t.newInvoiceForm.invoiceCreatedSuccessfully, { id: toastId });
        if (!markSaved()) return;
        router.push(ROUTES.invoices.detail(res.invoice.id));
      } else {
        toast.error(t.newInvoiceForm.failedToCreateInvoice, { id: toastId });
      }
    } catch (err: unknown) {
      console.error("Error creating invoice:", err);
      toast.error(errorMessage(err, t, t.newInvoiceForm.errorCreatingInvoice), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div inert={submitting || convertingQuoteId !== null || quoteInitializing} aria-busy={submitting || convertingQuoteId !== null || quoteInitializing} className="space-y-8 max-w-5xl mx-auto pb-16">
      <div>
        <Link
          href={ROUTES.invoices.list}
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-accent dark:text-slate-400 dark:hover:text-accent transition-colors font-medium active:scale-[0.98]"
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

      {/* Option: Import from Accepted Quotations */}
      {acceptedQuotations.length > 0 && (
        <Card className="p-5 bg-gradient-to-r from-teal-50/60 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-200/80 dark:border-teal-900/40 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary text-white">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{t.invoicesList.acceptedQuotesBanner || (t.newInvoiceForm.acceptedQuotationsReadyForInvoicing)}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tone-95 dark:bg-tone-15 text-primary dark:text-mint">
                    {acceptedQuotations.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t.invoicesList.acceptedQuotesSubtitle || (t.newInvoiceForm.selectAnAcceptedQuotationTo)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedQuotationId}
                onChange={(e) => {
                  const q = acceptedQuotations.find((item) => item.id === e.target.value);
                  if (q) applyQuotation(q);
                  else setSelectedQuotationId("");
                }}
                className="text-xs font-medium rounded-lg border border-teal-300 dark:border-teal-800 bg-white dark:bg-surface-raised px-3 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="">{t.newInvoiceForm.selectAcceptedQuote}</option>
                {acceptedQuotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quotationNumber} - {q.client?.companyName || q.client?.firstName || t.shared.client} ({Number(q.totalAmount).toFixed(3)} {q.currency})
                  </option>
                ))}
              </select>

              {selectedQuotationId && (
                <Button
                  type="button"
                  size="sm"
                  disabled={convertingQuoteId === selectedQuotationId}
                  onClick={() => handle1ClickConvert(selectedQuotationId)}
                  className="bg-primary hover:bg-primary-hover text-white text-xs gap-1.5 active:scale-[0.98] transition-all shrink-0"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{t.invoicesList.oneClickConvert || (t.newInvoiceForm.n1ClickConvert)}</span>
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Unified Client Selection Card (Dual Flow: Search Existing or Create New Inline) */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>{t.invoiceForm.particulars}</span>
            </h2>
            {selectedContact && (
              <Link
                href={ROUTES.crm.customer(selectedContact.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
              >
                <span>{t.invoiceForm.clientProfile}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {/* Unified Client Autocomplete & Inline Creator */}
            <ClientAutocomplete
              initialContacts={contacts}
              selectedContactId={selectedContactId}
              onSelect={(c) => {
                setSelectedContactId(c ? c.id : "");
                if (c) setContacts((prev) => [c, ...prev.filter((item) => item.id !== c.id)]);
              }}
              label={`${t.finance.client}`}
              required
              allowCreate
            />

            {/* Document Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
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
                  {Object.keys(CURRENCY_CONFIGS).map((code) => (
                    <option key={code} value={code}>
                      {getCurrencyDisplayLabel(code as SupportedCurrency, locale === "ar" ? "ar" : "en")}
                    </option>
                  ))}
                </Select>
              </div>

              {salesPeople.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.attribution.creditedTo}</label>
                  <Select value={salesOwnerId} onChange={(e) => setSalesOwnerId(e.target.value)}>
                    {currentUserId && !salesPeople.some((p) => p.id === currentUserId) && <option value={currentUserId}>{t.attribution.me}</option>}
                    {salesPeople.map((p) => (
                      <option key={p.id} value={p.id}>{p.id === currentUserId ? `${p.name} (${t.attribution.me})` : p.name}</option>
                    ))}
                  </Select>
                </div>
              )}

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
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Line Items Card */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-accent" />
              <span>{t.invoiceForm.deliverables}</span>
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addLineItem}
              className="gap-1.5 active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.invoiceForm.addItem}</span>
            </Button>
          </div>

          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 items-end"
              >
                {services.length > 0 && (
                  <div className="sm:col-span-12 md:col-span-3 space-y-1">
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {t.invoiceForm.presetService}
                    </label>
                    <Select
                      value={item.service_id || ""}
                      onChange={(e) => {
                        const sId = e.target.value;
                        const s = services.find((srv) => srv.id === sId);
                        if (s) {
                          const next = [...lineItems];
                          const price = convertFromBhd(Number(s.default_rate) || 0, fxRates[currency] ?? 1, currency);
                          next[index] = {
                            ...next[index],
                            service_id: s.id,
                            description_en: s.name_en,
                            description_ar: s.name_ar,
                            unit_price: price,
                            line_total: (Number(next[index].quantity) || 1) * price,
                          };
                          setLineItems(next);
                        } else {
                          updateLineItem(index, "service_id", undefined);
                        }
                      }}
                    >
                      <option value="">{t.invoiceForm.customItemNone}</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code || s.name_en} - {s.name_en}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div
                  className={`space-y-1 ${services.length > 0
                    ? "sm:col-span-12 md:col-span-4"
                    : "sm:col-span-12 md:col-span-6"
                    }`}
                >
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t.invoiceForm.descEnLabel}
                  </label>
                  <Input
                    placeholder={t.invoiceForm.placeholderEn}
                    value={item.description_en}
                    onChange={(e) =>
                      updateLineItem(index, "description_en", e.target.value)
                    }
                    required
                  />
                </div>

                <div
                  className={`space-y-1 ${services.length > 0
                    ? "sm:col-span-12 md:col-span-3"
                    : "sm:col-span-12 md:col-span-4"
                    }`}
                >
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t.invoiceForm.descArLabel}
                  </label>
                  <Input
                    dir="rtl"
                    placeholder={t.invoiceForm.placeholderAr}
                    value={item.description_ar || ""}
                    onChange={(e) =>
                      updateLineItem(index, "description_ar", e.target.value)
                    }
                  />
                </div>

                <div className="sm:col-span-4 md:col-span-2 space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t.invoiceForm.qty}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(index, "quantity", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="sm:col-span-4 md:col-span-2 space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t.invoiceForm.rate}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateLineItem(index, "unit_price", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="sm:col-span-4 md:col-span-2 space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t.finance.totalAmount}
                  </label>
                  <div className="h-10 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold flex items-center justify-end">
                    {item.line_total.toFixed(3)} {currency}
                  </div>
                </div>

                <div className="sm:col-span-12 md:col-span-1 flex justify-end">
                  <Button aria-label={t.actions.delete}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 active:scale-[0.98] transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Adjustments & Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
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
                    <option value="percentage">{t.invoiceForm.pctDiscount}</option>
                    <option value="fixed">{t.invoiceForm.fixedDiscount}</option>
                  </Select>
                </div>

                {discountType !== "none" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t.invoiceForm.discountAmtLabel}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={discountValue}
                      onChange={(e) =>
                        setDiscountValue(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                )}
              </div>

            </div>
          </Card>

          <Card className="p-6 bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 flex flex-col justify-between">
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-white/10 pb-2">
                {t.invoiceForm.summaryTitle}
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.finance.subtotal}</span>
                  <span className="font-mono font-medium">
                    {totals.subtotal.toFixed(3)} {currency}
                  </span>
                </div>

                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>
                      {t.finance.discount} ({discountType === "percentage" ? `${discountValue}%` : t.finance.discountFixed})
                    </span>
                    <span className="font-mono font-medium">
                      -{totals.discountAmount.toFixed(3)} {currency}
                    </span>
                  </div>
                )}

                {vatEnabled && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{t.finance.vat} ({vatPercentage}%)</span>
                    <span className="font-mono font-medium">
                      {totals.vatAmount.toFixed(3)} {currency}
                    </span>
                  </div>
                )}

                {otherTaxes.map((tax) => (
                  <div key={tax.code} className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{isRTL ? tax.name_ar : tax.name_en} ({tax.rate}%)</span>
                    <span className="font-mono font-medium">
                      {(totals.taxes.find((x) => x.code === tax.code)?.amount ?? 0).toFixed(3)} {currency}
                    </span>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between text-base font-bold text-slate-900 dark:text-white">
                  <span>{t.finance.totalAmount}</span>
                  <span className="font-mono text-primary dark:text-mint">
                    {totals.totalAmount.toFixed(3)} {currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-semibold shadow-xs active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? t.actions.saving : t.actions.save}</span>
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
