'use client';

import * as React from 'react';
import type { CompanySettings } from '@ishoot/database/types';
import { Card, Input, Button, Badge } from '@ishoot/ui';
import {
  Building2,
  Percent,
  Landmark,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { updateCompanySettingsAction } from '../../app/actions/settings';

interface CompanySettingsViewProps {
  initialSettings: CompanySettings;
}

export function CompanySettingsView({ initialSettings }: CompanySettingsViewProps) {
  const { t, locale, isRTL } = useAdminLocale();

  const [settings, setSettings] = React.useState<CompanySettings>(initialSettings);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [googleConnected, setGoogleConnected] = React.useState(true);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await updateCompanySettingsAction(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update company settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.nav.companySettings}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'إدارة بيانات السجل التجاري، الحسابات البنكية، إعدادات ضريبة القيمة المضافة، والربط مع Google Calendar.'
              : 'Configure legal CR information, banking coordinates, VAT compliance, and Google Calendar sync.'}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="gap-2 shadow-lg shadow-[#09937F]/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.actions.save}</span>
        </Button>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-[#09937F]/15 border border-[#09937F]/40 flex items-center gap-3 text-[#09937F] text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{locale === 'ar' ? 'تم حفظ وتحديث الإعدادات بنجاح في قاعدة البيانات!' : 'Company settings successfully updated!'}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. VAT & TAX CONFIGURATION */}
        <Card className="p-6 sm:p-8 bg-[#0B1210] border border-[#09937F]/30 shadow-2xl rounded-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Percent className="w-5 h-5 text-[#09937F]" />
            <div>
              <h2 className="text-base font-bold text-white">{t.settings.vatTitle}</h2>
              <p className="text-xs text-[#9EADA9]">
                {locale === 'ar'
                  ? 'التحويل بين نظام المنشأة غير الخاضعة للضريبة ونظام ضريبة القيمة المضافة (١٠٪).'
                  : 'Toggle between Non-VAT entity (0%) and 10% Bahrain VAT compliance.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#050807] border border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {settings.vat_enabled ? t.settings.vatActive : t.settings.vatInactive}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  settings.vat_enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-[#9EADA9] border border-white/10'
                }`}>
                  {settings.vat_enabled ? (locale === 'ar' ? 'ضريبة ١٠٪' : '10% VAT') : (locale === 'ar' ? 'معفى ٠٪' : '0% Non-VAT')}
                </span>
              </div>
              <p className="text-xs text-[#9EADA9] mt-1 max-w-xl">
                {settings.vat_enabled
                  ? (locale === 'ar'
                      ? 'سيتم احتساب ١٠٪ ضريبة قيمة مضافة على جميع الفواتير الجديدة وإظهار الرقم الضريبي الرسمي.'
                      : 'All new invoices will compute 10% VAT and render official tax registration.')
                  : (locale === 'ar'
                      ? 'ستظهر الفواتير عبارة "ضريبة القيمة المضافة: غير مطبقة" بمعدل ضريبة ٠٪.'
                      : 'Invoices will state "VAT: Not Applicable" and calculate totals with 0% tax.')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, vat_enabled: !settings.vat_enabled })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0 ${
                settings.vat_enabled ? 'bg-[#09937F]' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  settings.vat_enabled ? (isRTL ? '-translate-x-7' : 'translate-x-7') : (isRTL ? '-translate-x-1' : 'translate-x-1')
                }`}
              />
            </button>
          </div>

          {settings.vat_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9EADA9]">{t.settings.vatId}</label>
                <Input
                  value={settings.vat_id || ''}
                  onChange={(e) => setSettings({ ...settings, vat_id: e.target.value })}
                  placeholder="200019283700002"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9EADA9]">
                  {locale === 'ar' ? 'نسبة الضريبة (٪)' : 'VAT Rate (%)'}
                </label>
                <Input
                  type="number"
                  value={settings.vat_percentage}
                  onChange={(e) => setSettings({ ...settings, vat_percentage: parseFloat(e.target.value) || 10 })}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
        </Card>

        {/* 2. GOOGLE CALENDAR & INTEGRATIONS */}
        <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Calendar className="w-5 h-5 text-[#09937F]" />
            <div>
              <h2 className="text-base font-bold text-white">
                {locale === 'ar' ? 'الربط مع تقويم Google' : 'Google Calendar Integration'}
              </h2>
              <p className="text-xs text-[#9EADA9]">
                {locale === 'ar'
                  ? 'مزامنة مواعيد تصوير المشاريع وجلسات المونتاج تلقائياً مع تقويم Google لجميع أفراد الطاقم.'
                  : 'Automatic two-way sync between studio shoots, deadlines, and crew Google Calendars.'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#050807] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#09937F] animate-pulse" />
                <span className="text-sm font-bold text-white">
                  {locale === 'ar' ? 'خدمة Google Workspace: متصلة بنجاح' : 'Google Workspace API: Connected'}
                </span>
              </div>
              <p className="text-xs text-[#9EADA9]">
                production@ishoot.bh • {locale === 'ar' ? 'المزامنة التلقائية: نشطة' : 'Auto-Sync: Active'}
              </p>
            </div>

            <Button
              type="button"
              variant={googleConnected ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setGoogleConnected(!googleConnected)}
            >
              {googleConnected
                ? (locale === 'ar' ? 'إلغاء الربط' : 'Disconnect')
                : (locale === 'ar' ? 'ربط الحساب' : 'Connect Account')}
            </Button>
          </div>
        </Card>

        {/* 3. CORPORATE PROFILE & CR */}
        <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Building2 className="w-5 h-5 text-[#09937F]" />
            <div>
              <h2 className="text-base font-bold text-white">{t.settings.companyTitle}</h2>
              <p className="text-xs text-[#9EADA9]">
                {locale === 'ar'
                  ? 'بيانات السجل التجاري، اسم المنشأة الرسمي، والعنوان المسجل.'
                  : 'Legal entity name, Commercial Registration, and physical headquarters address.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {locale === 'ar' ? 'اسم المنشأة بالإنجليزية' : 'Company Legal Name (English)'}
              </label>
              <Input
                value={settings.company_name_en}
                onChange={(e) => setSettings({ ...settings, company_name_en: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {locale === 'ar' ? 'اسم المنشأة بالعربية' : 'Company Legal Name (Arabic)'}
              </label>
              <Input
                value={settings.company_name_ar}
                onChange={(e) => setSettings({ ...settings, company_name_ar: e.target.value })}
                className="text-end font-arabic"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {locale === 'ar' ? 'رقم السجل التجاري (CR)' : 'Commercial Registration (CR #)'}
              </label>
              <Input
                value={settings.cr_number}
                onChange={(e) => setSettings({ ...settings, cr_number: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">
                {locale === 'ar' ? 'العملة الافتراضية' : 'Default Currency'}
              </label>
              <Input
                disabled
                value={`${settings.default_currency} (${settings.currency_decimals} ${locale === 'ar' ? 'كسور عشرية' : 'decimals'})`}
                className="font-mono bg-white/5 opacity-70"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-[#9EADA9]">
                {locale === 'ar' ? 'عنوان مقر الاستوديو' : 'Studio Address'}
              </label>
              <Input
                value={locale === 'ar' ? settings.address_ar : (settings.address_en || settings.address_ar)}
                onChange={(e) => setSettings({ ...settings, address_ar: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* 4. BANKING & WIRE SETTLEMENT COORDINATES */}
        <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Landmark className="w-5 h-5 text-[#09937F]" />
            <div>
              <h2 className="text-base font-bold text-white">{t.settings.bankTitle}</h2>
              <p className="text-xs text-[#9EADA9]">
                {locale === 'ar'
                  ? 'بيانات الحساب البنكي والتحويل المطبوعة على الفواتير الرسمية.'
                  : 'Beneficiary bank wire coordinates stamped on official invoices.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">{t.settings.bankName}</label>
              <Input
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">{t.settings.bankIban}</label>
              <Input
                value={settings.bank_iban}
                onChange={(e) => setSettings({ ...settings, bank_iban: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">{t.settings.bankAccount}</label>
              <Input
                value={settings.bank_account_number}
                onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">{t.settings.bankSwift}</label>
              <Input
                value={settings.bank_swift}
                onChange={(e) => setSettings({ ...settings, bank_swift: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>
        </Card>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={saving}
            className="shadow-xl shadow-[#09937F]/25"
          >
            {t.actions.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
