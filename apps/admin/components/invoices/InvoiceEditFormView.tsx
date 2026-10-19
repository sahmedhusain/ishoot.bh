"use client";
import { formatMessage } from "@ishoot/locales";
import { useCompanyVat } from "../../hooks/useCompanyVat";
import { getCurrencyLabel } from "@ishoot/config/currency";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
Invoice,
CRMContact,
CompanySettings,
InvoiceLineItem,
DiscountType,
SupportedCurrency,
ServiceItem,
} from "@ishoot/database/types";
import {
CURRENCY_CONFIGS,
calculateInvoiceTotals,
getCurrencyDisplayLabel,
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
  Building,
  User,
  Mail,
  Phone,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { convertFromBhd } from "../../lib/fx-client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  updateInvoiceAction,
  voidInvoiceAction,
} from "../../app/actions/finance";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";
import { EditConfirmModal,type FieldChange } from "../shared/EditConfirmModal";

interface InvoiceEditFormViewProps {
  invoice: Invoice;
  initialContacts: CRMContact[];
  company: CompanySettings | null;
  services?: ServiceItem[];
  /** Units of each supported currency per 1 BHD; service catalogue prices are in BHD. */
  fxRates?: Record<string, number>;
}

export function InvoiceEditFormView({
  invoice,
  initialContacts,
  company,
  services = [],
  fxRates = {},
}: InvoiceEditFormViewProps) {
  const router = useRouter();
  const { t, isRTL, locale } = useAdminLocale();
  const bhd = getCurrencyLabel("BHD", locale === "ar");

  const [contacts, setContacts] = React.useState<CRMContact[]>(initialContacts);
  const [submitting, setSubmitting] = React.useState(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = React.useState(false);

  const [selectedContactId, setSelectedContactId] = React.useState(
    invoice.client_id || invoice.contact_id || "",
  );

  const selectedContact = React.useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

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
  // VAT follows the company registration only; saving re-applies the current company rule.
  const [vatEnabled] = React.useState<boolean>(
    company?.vat_enabled ?? false,
  );
  const [vatPercentage] = React.useState<number>(
    company?.vat_enabled ? Number(company.vat_percentage ?? 10) : 0,
  );

  const isLocked = invoice.status === "void";

  // Drafts follow the company tax registry; an issued invoice keeps the taxes it was issued with.
  const { taxes: registeredTaxes } = useCompanyVat();
  const otherTaxes =
    invoice.status === "draft"
      ? registeredTaxes.filter((tax) => tax.invoices)
      : (invoice.other_taxes ?? []).map((tax) => ({ ...tax, invoices: true, quotations: false }));
  const totals = calculateInvoiceTotals(
    lineItems,
    discountType,
    discountValue,
    vatEnabled,
    vatPercentage,
    currency,
    otherTaxes,
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

  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  const changes: FieldChange[] = React.useMemo(() => [
    {
      field: "issue_date",
      label: t.invoiceEditForm.issueDate,
      oldValue: invoice.issue_date,
      newValue: issueDate,
    },
    {
      field: "due_date",
      label: t.invoiceEditForm.dueDate,
      oldValue: invoice.due_date,
      newValue: dueDate,
    },
    {
      field: "vat_enabled",
      label: t.invoiceEditForm.vatStatus,
      oldValue: invoice.vat_enabled ? `Enabled (${invoice.vat_percentage}%)` : t.invoiceEditForm.disabledNoVat,
      newValue: vatEnabled ? `Enabled (${vatPercentage}%)` : t.invoiceEditForm.disabledNoVat,
    },
    {
      field: "subtotal",
      label: t.invoiceEditForm.subtotal,
      oldValue: `${Number(invoice.subtotal).toFixed(3)} ${currency}`,
      newValue: `${totals.subtotal.toFixed(3)} ${currency}`,
    },
    {
      field: "discount_amount",
      label: t.invoiceEditForm.discount,
      oldValue: `${Number(invoice.discount_amount).toFixed(3)} ${currency}`,
      newValue: `${totals.discountAmount.toFixed(3)} ${currency}`,
    },
    {
      field: "vat_amount",
      label: t.invoiceEditForm.vatAmount,
      oldValue: `${Number(invoice.vat_amount).toFixed(3)} ${currency}`,
      newValue: `${totals.vatAmount.toFixed(3)} ${currency}`,
    },
    {
      field: "total_amount",
      label: t.invoiceEditForm.totalAmount,
      oldValue: `${Number(invoice.total_amount).toFixed(3)} ${currency}`,
      newValue: `${totals.totalAmount.toFixed(3)} ${currency}`,
    },
    {
      field: "notes_en",
      label: t.invoiceEditForm.englishNotes,
      oldValue: invoice.notes_en || "",
      newValue: notesEn,
    },
    {
      field: "notes_ar",
      label: t.invoiceEditForm.arabicNotes,
      oldValue: invoice.notes_ar || "",
      newValue: notesAr,
    },
  ], [t, invoice, issueDate, dueDate, vatEnabled, vatPercentage, totals, currency, notesEn, notesAr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || submitting) return;

    const validItems = lineItems.filter(
      (item) => item.description_en.trim() !== "",
    );
    if (validItems.length === 0) return;

    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    const validItems = lineItems.filter(
      (item) => item.description_en.trim() !== "",
    );
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
        vat_percentage: vatPercentage,
        line_items: validItems.map((item) => ({
          service_id: item.service_id || undefined,
          description_en: item.description_en,
          description_ar: item.description_ar || undefined,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });

      router.push(ROUTES.invoices.detail(invoice.id));
    } catch (err) {
      console.error("Failed to update invoice:", err);
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const handleVoid = async () => {
    try {
      await voidInvoiceAction(invoice.id);
      router.push(ROUTES.invoices.detail(invoice.id));
    } catch (err) {
      console.error("Failed to void invoice:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={ROUTES.invoices.detail(invoice.id)}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-slate-600 dark:text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.actions.back}</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
              {t.invoiceEdit.title} — {invoice.invoice_number}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.invoiceEdit.subtitle}
            </p>
          </div>
        </div>

        {!isLocked && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoidConfirmOpen(true)}
            className="gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 self-start sm:self-auto"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.invoiceEdit.voidInvoice}</span>
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Client Selection & Auto-fetch */}
        <Card className="p-6 bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.invoiceEdit.clientInfo}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.invoiceEdit.clientHelper}
              </p>
            </div>
            {selectedContact && (
              <Link
                href={ROUTES.crm.customer(selectedContact.id)}
                className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>{t.invoiceEdit.viewDossier}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>


          {/* Client Search / Autocomplete */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              {t.invoiceEdit.searchSelectClient}
            </label>
            <ClientAutocomplete
              contacts={contacts}
              selectedContactId={selectedContactId}
              onSelectClient={(contact) => {
                const exists = contacts.some((c) => c.id === contact.id);
                if (!exists) {
                  setContacts((prev) => [contact, ...prev]);
                }
                setSelectedContactId(contact.id);
              }}
              disabled={isLocked}
              placeholder={t.invoiceEdit.clientSearchPlaceholder}
            />

            {/* Selected Client Live Card */}
            {selectedContact && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-accent" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedContact.company || selectedContact.full_name}
                    </span>
                  </div>
                  <Link
                    href={ROUTES.crm.customer(selectedContact.id)}
                    className="text-xs text-primary dark:text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <span>{t.invoiceEdit.viewDossier}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedContact.full_name}</span>
                  </div>
                  {selectedContact.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="">{selectedContact.email}</span>
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div className="flex items-center gap-1.5" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className=""><bdi dir="ltr">{selectedContact.phone}</bdi></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Invoice Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.invoiceEdit.currency}
              </label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                disabled={isLocked}
              >
                {Object.keys(CURRENCY_CONFIGS).map((code) => (
                  <option key={code} value={code}>
                    {getCurrencyDisplayLabel(code as SupportedCurrency, isRTL ? "ar" : "en")}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.invoiceEdit.language}
              </label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                disabled={isLocked}
              >
                <option value="ar">{t.invoiceForm.arabic}</option>
                <option value="en">{t.invoiceForm.english}</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.invoiceEdit.issueDate} *
              </label>
              <Input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                disabled={isLocked}
                className=""
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.invoiceEdit.dueDate} *
              </label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isLocked}
                className=""
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Line Items */}
        <Card className="p-6 bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.invoiceEdit.lineItems}
            </h2>
            {!isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.invoiceEdit.addDeliverable}</span>
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-3"
              >
                {/* Standard Service Quick Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>{t.invoiceEdit.itemNumber} #{idx + 1}</span>
                    {item.service_id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-accent border border-teal-200 dark:border-teal-800 ">
                        {t.invoiceEdit.catalogLinked}
                      </span>
                    )}
                  </div>
                  {!isLocked && services && services.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.invoiceEdit.presetService}
                      </span>
                      <select
                        value={item.service_id || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            handleLineItemChange(idx, "service_id" as any, undefined);
                            return;
                          }
                          const s = services.find((srv) => srv.id === val);
                          if (s) {
                            setLineItems((prev) => {
                              const next = [...prev];
                              const qty = Number(next[idx].quantity) || 1;
                              const price = convertFromBhd(Number(s.default_rate) || 0, fxRates[currency] ?? 1, currency);
                              next[idx] = {
                                ...next[idx],
                                service_id: s.id,
                                description_en: s.name_en,
                                description_ar: s.name_ar || undefined,
                                unit_price: price,
                                line_total: qty * price,
                              };
                              return next;
                            });
                          }
                        }}
                        className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="">{t.invoiceEdit.customItemNone}</option>
                        {services.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name_en} ({srv.default_rate.toFixed(3)} {bhd} / {srv.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                      {t.invoiceEdit.descEn} *
                    </label>
                    <Input
                      required
                      placeholder={t.invoiceEdit.descEnPlaceholder}
                      value={item.description_en}
                      onChange={(e) =>
                        handleLineItemChange(idx, "description_en", e.target.value)
                      }
                      disabled={isLocked}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                      {t.invoiceEdit.descAr}
                    </label>
                    <Input
                      placeholder={t.invoiceForm.placeholderAr}
                      value={item.description_ar || ""}
                      onChange={(e) =>
                        handleLineItemChange(idx, "description_ar", e.target.value)
                      }
                      disabled={isLocked}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                      {t.invoiceEdit.quantity}
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
                      className=""
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                      {t.invoiceEdit.unitPrice} ({currency})
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
                      className=""
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                        {t.invoiceEdit.lineTotal}
                      </label>
                      <div className="text-sm font-bold text-slate-900 dark:text-white  h-10 flex items-center">
                        {(item.quantity * item.unit_price).toFixed(3)} {currency}
                      </div>
                    </div>
                    {lineItems.length > 1 && !isLocked && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        title={t.invoiceEdit.removeItem}
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

        {/* Section 3: Discounts & Tax Adjustments */}
        <Card className="p-6 bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-3">
            {t.invoiceEdit.discountTaxAdjustments}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.invoiceEdit.discountType}
              </label>
              <Select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                disabled={isLocked}
              >
                <option value="none">{t.invoiceEdit.noDiscount}</option>
                <option value="percentage">{t.invoiceEdit.discountPercentage}</option>
                <option value="fixed">{t.invoiceEdit.discountFixed} ({currency})</option>
              </Select>
            </div>

            {discountType !== "none" && (
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {t.invoiceEdit.discountValue}
                </label>
                <Input
                  type="number"
                  step="0.001"
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(parseFloat(e.target.value) || 0)
                  }
                  disabled={isLocked}
                  className=""
                />
              </div>
            )}

          </div>
        </Card>

        {/* Section 4: Terms & Notes */}
        <Card className="p-6 bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-3">
            {t.invoiceEdit.invoiceTermsNotes}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.invoiceEdit.notesEn}
              </label>
              <textarea
                rows={3}
                placeholder={t.invoiceEdit.notesEnPlaceholder}
                value={notesEn}
                onChange={(e) => setNotesEn(e.target.value)}
                disabled={isLocked}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {t.invoiceEdit.notesAr}
              </label>
              <textarea
                rows={3}
                placeholder={t.invoiceForm.placeholderAr}
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                disabled={isLocked}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </Card>

        {/* Section 5: Totals Summary */}
        <Card className="p-6 bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-3">
            <span className="text-slate-500 dark:text-slate-400">{t.invoiceEdit.subtotal}</span>
            <span className=" font-bold text-slate-900 dark:text-white">
              {totals.subtotal.toFixed(3)} {currency}
            </span>
          </div>

          {discountType !== "none" && (
            <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-3">
              <span className="text-slate-500 dark:text-slate-400">{t.invoiceEdit.discount}</span>
              <span className=" font-bold text-rose-600 dark:text-rose-400">
                -{totals.discountAmount.toFixed(3)} {currency}
              </span>
            </div>
          )}

          {vatEnabled && (
            <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-3">
              <span className="text-slate-500 dark:text-slate-400">
                {t.invoiceEdit.vatRate} ({vatPercentage}%)
              </span>
              <span className=" font-bold text-accent">
                +{totals.vatAmount.toFixed(3)} {currency}
              </span>
            </div>
          )}

          {otherTaxes.map((tax) => (
            <div key={tax.code} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-3">
              <span className="text-slate-500 dark:text-slate-400">
                {isRTL ? tax.name_ar : tax.name_en} ({tax.rate}%)
              </span>
              <span className=" font-bold text-accent">
                +{(totals.taxes.find((x) => x.code === tax.code)?.amount ?? 0).toFixed(3)} {currency}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between text-sm border-t-2 border-accent/40 pt-3">
            <span className="font-bold text-slate-900 dark:text-white">{t.invoiceEdit.totalAmount}</span>
            <span className=" font-bold text-2xl text-primary dark:text-accent">
              {totals.totalAmount.toFixed(3)} {currency}
            </span>
          </div>
        </Card>

        {/* Actions Toolbar */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-4">
          <Link href={ROUTES.invoices.detail(invoice.id)}>
            <Button type="button" variant="outline" size="sm">
              {t.actions.cancel}
            </Button>
          </Link>
          {!isLocked && (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="gap-2 bg-primary hover:bg-primary/90 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting ? t.invoiceEdit.saving : t.invoiceEdit.save}
              </span>
            </Button>
          )}
        </div>
      </form>

      <ConfirmDestructiveModal
        isOpen={voidConfirmOpen}
        onClose={() => setVoidConfirmOpen(false)}
        onConfirm={handleVoid}
        title={t.invoiceEdit.voidCheckpointTitle}
        description={t.invoiceEdit.voidCheckpointDesc.replace("invoice", `invoice ${invoice.invoice_number}`)}
        confirmLabel={t.invoiceEdit.confirmVoid}
      />

      <EditConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSave}
        changes={changes}
        isSaving={submitting}
        title={formatMessage(t.invoiceEdit.confirmEditTitle, { number: invoice.invoice_number })}
        description={t.invoiceEditForm.reviewTheUpdatedInvoiceValues}
      />
    </div>
  );
}
