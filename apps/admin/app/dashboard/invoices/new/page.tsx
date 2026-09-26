'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  getCRMContacts,
  getCompanySettings,
  CRMContact,
  CompanySettings,
  InvoiceLineItem,
  DiscountType,
  SupportedCurrency,
  CURRENCY_CONFIGS,
  calculateInvoiceTotals,
} from '@ishoot/database';
import { Card, Input, Select, Button, Badge } from '@ishoot/ui';
import { Plus, Trash2, ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';

export default function NewInvoicePage() {
  const router = useRouter();

  const [contacts, setContacts] = React.useState<CRMContact[]>([]);
  const [company, setCompany] = React.useState<CompanySettings | null>(null);

  // Form States
  const [selectedContactId, setSelectedContactId] = React.useState('');
  const [currency, setCurrency] = React.useState<SupportedCurrency>('BHD');
  const [language, setLanguage] = React.useState<'en' | 'ar'>('en');
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = React.useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  const [lineItems, setLineItems] = React.useState<InvoiceLineItem[]>([
    {
      description_en: 'Commercial Cinematography Production Package',
      description_ar: 'حزمة الإنتاج والتصوير السينمائي الإعلاني',
      quantity: 1,
      unit_price: 1500.0,
      line_total: 1500.0,
    },
  ]);

  const [discountType, setDiscountType] = React.useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [vatEnabled, setVatEnabled] = React.useState<boolean>(false);

  React.useEffect(() => {
    Promise.all([getCRMContacts(), getCompanySettings()]).then(([cList, comp]) => {
      setContacts(cList);
      if (cList.length > 0) setSelectedContactId(cList[0].id);
      setCompany(comp);
      setVatEnabled(comp.vat_enabled);
      setCurrency(comp.default_currency);
    });
  }, []);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description_en: '',
        description_ar: '',
        quantity: 1,
        unit_price: 0,
        line_total: 0,
      },
    ]);
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        item.line_total = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      }
      next[index] = item;
      return next;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculation Engine
  const totals = React.useMemo(() => {
    return calculateInvoiceTotals(
      lineItems,
      discountType,
      discountValue,
      vatEnabled,
      company?.vat_percentage || 10,
      currency
    );
  }, [lineItems, discountType, discountValue, vatEnabled, company, currency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to invoices list with success
    router.push('/dashboard/invoices');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-xs text-[#9EADA9] hover:text-[#09937F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices Archive</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          Create Commercial Invoice
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">
          Precision-calculated billing with multi-currency support, discounts, and letterhead localization.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. Header Information */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Invoice Particulars
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {/* Client Autocomplete */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[#9EADA9]">Billed Client *</label>
              <Select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} (${c.full_name})` : c.full_name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Currency Selector (GCC + USD) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Currency</label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className="font-mono"
              >
                <option value="BHD">BHD — Bahraini Dinar (3 Dec)</option>
                <option value="SAR">SAR — Saudi Riyal (2 Dec)</option>
                <option value="AED">AED — UAE Dirham (2 Dec)</option>
                <option value="KWD">KWD — Kuwaiti Dinar (3 Dec)</option>
                <option value="OMR">OMR — Omani Rial (3 Dec)</option>
                <option value="QAR">QAR — Qatari Riyal (2 Dec)</option>
                <option value="USD">USD — US Dollar (2 Dec)</option>
              </Select>
            </div>

            {/* Template Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Document Language</label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
              >
                <option value="en">English Letterhead (LTR)</option>
                <option value="ar">Arabic Letterhead (RTL)</option>
              </Select>
            </div>

            {/* Issue Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Issue Date</label>
              <Input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Payment Due Date</label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* 2. Line Items Repeater */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Deliverable Line Items
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </Button>
          </div>

          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-[#050807] border border-white/10 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[11px] text-[#9EADA9]">Description (English)</label>
                    <Input
                      placeholder="e.g. Cinema Camera Day Rate"
                      value={item.description_en}
                      onChange={(e) => updateLineItem(index, 'description_en', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] text-[#9EADA9]">الوصف بالعربية</label>
                    <Input
                      placeholder="الوصف بالعربية"
                      value={item.description_ar || ''}
                      onChange={(e) => updateLineItem(index, 'description_ar', e.target.value)}
                      className="font-arabic text-end"
                    />
                  </div>

                  <div className="md:col-span-1 space-y-1">
                    <label className="text-[11px] text-[#9EADA9]">Qty</label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                      className="font-mono text-center"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] text-[#9EADA9]">Rate ({currency})</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>

                  <div className="md:col-span-1 flex items-center justify-end pt-5">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-rose-400 hover:text-rose-300 p-2"
                        title="Delete line"
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

        {/* 3. Discounts & VAT Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Discount & VAT Options */}
          <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Discounts & Regulatory Tax
            </h3>

            {/* Discount Control */}
            <div className="space-y-2">
              <label className="text-xs text-[#9EADA9]">Commercial Discount</label>
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'percentage', 'fixed'] as DiscountType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDiscountType(type)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium capitalize border transition-all ${
                      discountType === type
                        ? 'bg-[#09937F]/20 text-[#09937F] border-[#09937F]'
                        : 'bg-white/5 text-[#9EADA9] border-white/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {discountType !== 'none' && (
                <div className="pt-2">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder={discountType === 'percentage' ? 'Enter percentage %' : `Enter amount in ${currency}`}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
              )}
            </div>

            {/* VAT Toggle Override */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white">Apply VAT (10%):</span>
                  <div className="text-[11px] text-[#9EADA9]">
                    {vatEnabled ? 'Tax calculated at 10%' : 'VAT Not Applicable (0%)'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVatEnabled(!vatEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    vatEnabled ? 'bg-[#09937F]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      vatEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>

          {/* Live Calculation Panel */}
          <Card className="p-6 bg-[#070C0A] border border-[#09937F]/30 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider pb-2 border-b border-white/10 font-sans">
              <Calculator className="w-4 h-4 text-[#09937F]" />
              <span>Real-Time Financial Totals</span>
            </div>

            <div className="flex justify-between text-[#9EADA9]">
              <span>Subtotal:</span>
              <span className="text-white font-bold">{totals.subtotal.toFixed(3)} {currency}</span>
            </div>

            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Discount:</span>
                <span>-{totals.discountAmount.toFixed(3)} {currency}</span>
              </div>
            )}

            <div className="flex justify-between text-[#9EADA9]">
              <span>Net after Discount:</span>
              <span className="text-white">{totals.afterDiscount.toFixed(3)} {currency}</span>
            </div>

            <div className="flex justify-between text-[#9EADA9]">
              <span>VAT ({vatEnabled ? '10%' : 'N/A'}):</span>
              <span className={vatEnabled ? 'text-amber-400' : 'text-[#9EADA9]'}>
                {totals.vatAmount.toFixed(3)} {currency}
              </span>
            </div>

            <div className="pt-3 border-t-2 border-white/20 flex justify-between text-base font-bold text-[#09937F]">
              <span className="font-sans">TOTAL DUE:</span>
              <span>{totals.totalAmount.toFixed(3)} {currency}</span>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/invoices">
            <Button type="button" variant="ghost" size="lg">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg">
            Save Invoice & Open Dispatch Studio
          </Button>
        </div>
      </form>
    </div>
  );
}
