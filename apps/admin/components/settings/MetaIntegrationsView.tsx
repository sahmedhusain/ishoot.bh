'use client';

import * as React from 'react';
import { Card, Input, Button, Badge } from '@ishoot/ui';
import {
  Share2,
  CheckCircle2,
  MessageSquare,
  Instagram,
  Facebook,
  Key,
  Webhook,
  Send,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { SettingsNavTabs } from './SettingsNavTabs';

export function MetaIntegrationsView() {
  const { t, locale, isRTL } = useAdminLocale();

  const [whatsappPhoneId, setWhatsappPhoneId] = React.useState('109827364512938');
  const [whatsappBusinessId, setWhatsappBusinessId] = React.useState('782910394857201');
  const [whatsappToken, setWhatsappToken] = React.useState('EAAG8ZCK...9482LDP');
  const [webhookSecret, setWebhookSecret] = React.useState('ishoot_meta_wh_sec_2026_bh');
  const [instagramAccountId, setInstagramAccountId] = React.useState('ishoot.bh');
  const [facebookPageId, setFacebookPageId] = React.useState('102938475610293');

  const [autoSendInvoices, setAutoSendInvoices] = React.useState(true);
  const [autoSendReceipts, setAutoSendReceipts] = React.useState(true);
  const [syncInstagramDMs, setSyncInstagramDMs] = React.useState(true);
  const [syncFacebookLeads, setSyncFacebookLeads] = React.useState(true);

  const [saved, setSaved] = React.useState(false);
  const [testSent, setTestSent] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestWhatsApp = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Tabs */}
      <SettingsNavTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {locale === 'ar' ? 'ربط وتكامل منصات ميتا (Meta APIs)' : 'Meta Platform Integrations'}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'تفعيل قنوات WhatsApp Cloud API، وحساب إنستغرام للأعمال، وإعلانات فيسبوك لتوليد العملاء تلقائياً في CRM.'
              : 'Direct API synchronization for WhatsApp Cloud API, Instagram Graph API, and Facebook Lead Ads.'}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          className="gap-2 shadow-lg shadow-[#09937F]/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.actions.save}</span>
        </Button>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-[#09937F]/15 border border-[#09937F]/40 flex items-center gap-3 text-[#09937F] text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{locale === 'ar' ? 'تم حفظ بيانات الربط وتحديث إعدادات منصات ميتا بنجاح!' : 'Meta API settings successfully saved and verified!'}</span>
        </div>
      )}

      {testSent && (
        <div className="p-4 rounded-2xl bg-blue-500/15 border border-blue-500/40 flex items-center gap-3 text-blue-400 text-xs font-semibold animate-fade-in">
          <Send className="w-4 h-4 shrink-0" />
          <span>{locale === 'ar' ? 'تم إرسال رسالة اختبار عبر WhatsApp Cloud API بنجاح إلى رقم الإدارة!' : 'Test message successfully dispatched via WhatsApp Cloud API!'}</span>
        </div>
      )}

      {/* 1. WhatsApp Cloud API */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">WhatsApp Cloud API (Meta Official)</h2>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                  {locale === 'ar' ? 'متصل ونشط' : 'Connected'}
                </Badge>
              </div>
              <p className="text-xs text-[#9EADA9]">
                {locale === 'ar'
                  ? 'إرسال الفواتير الرسمية وروابط السداد وإيصالات القبض آلياً للعملاء عبر رقم الشركة الرسمي الموثق (+973).'
                  : 'Automated dispatch of verified invoices, payment links, and receipts directly to client WhatsApp.'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestWhatsApp}
            className="text-xs gap-1.5 border-white/10 text-[#9EADA9] hover:text-white"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>{locale === 'ar' ? 'إرسال رسالة اختبار' : 'Send Test Ping'}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {locale === 'ar' ? 'معرّف رقم هاتف واتساب (Phone Number ID)' : 'WhatsApp Phone Number ID'}
            </label>
            <Input
              value={whatsappPhoneId}
              onChange={(e) => setWhatsappPhoneId(e.target.value)}
              className="bg-[#050807] border-white/10 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {locale === 'ar' ? 'معرّف حساب واتساب للأعمال (WABA ID)' : 'WhatsApp Business Account ID'}
            </label>
            <Input
              value={whatsappBusinessId}
              onChange={(e) => setWhatsappBusinessId(e.target.value)}
              className="bg-[#050807] border-white/10 font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {locale === 'ar' ? 'رمز الوصول الدائم للنظام (Permanent Access Token)' : 'System User Access Token'}
            </label>
            <Input
              type="password"
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              className="bg-[#050807] border-white/10 font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2 p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                {locale === 'ar' ? 'إرسال الفواتير الضريبية بصيغة PDF فور إصدارها' : 'Auto-dispatch PDF tax invoices upon issuance'}
              </span>
              <button
                type="button"
                onClick={() => setAutoSendInvoices(!autoSendInvoices)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSendInvoices ? 'bg-[#09937F]' : 'bg-white/20'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSendInvoices ? (isRTL ? '-translate-x-6' : 'translate-x-6') : (isRTL ? '-translate-x-1' : 'translate-x-1')}`} />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-white">
                {locale === 'ar' ? 'إرسال إيصال السداد فور تسجيل الدفعة البنكية' : 'Auto-dispatch payment receipts upon reconciliation'}
              </span>
              <button
                type="button"
                onClick={() => setAutoSendReceipts(!autoSendReceipts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSendReceipts ? 'bg-[#09937F]' : 'bg-white/20'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSendReceipts ? (isRTL ? '-translate-x-6' : 'translate-x-6') : (isRTL ? '-translate-x-1' : 'translate-x-1')}`} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Instagram & Facebook Leads Integration */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Instagram className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Instagram Graph & Facebook Lead Ads</h2>
            <p className="text-xs text-[#9EADA9]">
              {locale === 'ar'
                ? 'تحويل استفسارات ورسائل إنستغرام وحملات إعلانات فيسبوك مباشرة إلى صفقات في نظام CRM.'
                : 'Directly ingest Instagram direct inquiries and Facebook Lead Ads into the CRM pipeline.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {locale === 'ar' ? 'حساب إنستغرام الرسمي للأعمال' : 'Instagram Professional Handle'}
            </label>
            <Input
              value={instagramAccountId}
              onChange={(e) => setInstagramAccountId(e.target.value)}
              className="bg-[#050807] border-white/10 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#9EADA9] block mb-1.5">
              {locale === 'ar' ? 'معرّف صفحة فيسبوك الرسمية (Page ID)' : 'Facebook Page ID'}
            </label>
            <Input
              value={facebookPageId}
              onChange={(e) => setFacebookPageId(e.target.value)}
              className="bg-[#050807] border-white/10 font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2 p-4 rounded-2xl bg-[#050807] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                {locale === 'ar' ? 'إنشاء صفقة جديدة في CRM فور وصول عميل محتمل من إعلانات Lead Ads' : 'Automatically create CRM Deal on new Facebook Lead'}
              </span>
              <button
                type="button"
                onClick={() => setSyncFacebookLeads(!syncFacebookLeads)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  syncFacebookLeads ? 'bg-[#09937F]' : 'bg-white/20'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${syncFacebookLeads ? (isRTL ? '-translate-x-6' : 'translate-x-6') : (isRTL ? '-translate-x-1' : 'translate-x-1')}`} />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
