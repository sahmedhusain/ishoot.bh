'use client';

import * as React from 'react';
import { getCompanySettings, updateCompanySettings, CompanySettings } from '@ishoot/database';
import { Card, Input, Button, Badge } from '@ishoot/ui';
import { Building2, Percent, Landmark, CheckCircle2 } from 'lucide-react';

export default function CompanySettingsPage() {
  const [settings, setSettings] = React.useState<CompanySettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    getCompanySettings().then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaved(false);
    await updateCompanySettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading || !settings) return <div className="text-sm text-[#9EADA9]">Loading entity settings...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          Company & Financial Entity Settings
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">
          Configure corporate registration, bank settlement coordinates, and the regulatory VAT status.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Company settings and tax configuration saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. VAT & TAX CONFIGURATION (DIRECTIVE FROM CLIENT) */}
        <Card className="p-6 sm:p-8 bg-[#0B1210] border border-[#09937F]/30 shadow-2xl rounded-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Percent className="w-5 h-5 text-[#09937F]" />
            <div>
              <h2 className="text-lg font-bold text-white">VAT & Tax Configuration</h2>
              <p className="text-xs text-[#9EADA9]">
                Toggle between Non-VAT Entity (current) and 10% Bahrain VAT Registered Entity.
              </p>
            </div>
          </div>

          {/* Dynamic Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#050807] border border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Tax Registration Mode:</span>
                <Badge variant={settings.vat_enabled ? 'emerald' : 'outline'}>
                  {settings.vat_enabled ? 'VAT Activated (10%)' : 'Non-VAT Entity (Active)'}
                </Badge>
              </div>
              <p className="text-xs text-[#9EADA9] mt-1">
                {settings.vat_enabled
                  ? 'All newly generated invoices will compute 10% VAT and render the official VAT ID.'
                  : 'Invoices will state "VAT: Not Applicable" and calculate totals with 0% tax.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, vat_enabled: !settings.vat_enabled })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                settings.vat_enabled ? 'bg-[#09937F]' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  settings.vat_enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">VAT Registration ID</label>
              <Input
                value={settings.vat_id || ''}
                onChange={(e) => setSettings({ ...settings, vat_id: e.target.value })}
                placeholder="e.g. 200000000000002"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">VAT Standard Percentage (%)</label>
              <Input
                type="number"
                step="0.01"
                value={settings.vat_percentage}
                onChange={(e) => setSettings({ ...settings, vat_percentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </Card>

        {/* 2. CORPORATE IDENTITY & COMMERCIAL REGISTRATION */}
        <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Building2 className="w-5 h-5 text-[#09937F]" />
            <div>
              <h2 className="text-lg font-bold text-white">Commercial Registration & Profile</h2>
              <p className="text-xs text-[#9EADA9]">Legal name and contact details printed on letterheads.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Company Name (English)</label>
              <Input
                value={settings.company_name_en}
                onChange={(e) => setSettings({ ...settings, company_name_en: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Company Name (Arabic)</label>
              <Input
                value={settings.company_name_ar}
                onChange={(e) => setSettings({ ...settings, company_name_ar: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">CR Number</label>
              <Input
                value={settings.cr_number}
                onChange={(e) => setSettings({ ...settings, cr_number: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Default Currency</label>
              <Input
                value={settings.default_currency}
                disabled
                className="font-mono"
              />
            </div>
          </div>
        </Card>

        {/* 3. SETTLEMENT BANK & IBAN */}
        <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Landmark className="w-5 h-5 text-[#09937F]" />
            <div>
              <h2 className="text-lg font-bold text-white">Bank Settlement Coordinates</h2>
              <p className="text-xs text-[#9EADA9]">Direct wire transfer instructions embedded in invoices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Beneficiary Bank Name</label>
              <Input
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">IBAN Number</label>
              <Input
                value={settings.bank_iban}
                onChange={(e) => setSettings({ ...settings, bank_iban: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">Account Number</label>
              <Input
                value={settings.bank_account_number}
                onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">SWIFT / BIC Code</label>
              <Input
                value={settings.bank_swift}
                onChange={(e) => setSettings({ ...settings, bank_swift: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>
        </Card>

        <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
          Save Entity Settings
        </Button>
      </form>
    </div>
  );
}
