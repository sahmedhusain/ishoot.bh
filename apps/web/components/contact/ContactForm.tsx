'use client';

import * as React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { ServicePills } from './ServicePills';
import { BudgetSelector } from './BudgetSelector';
import { Input, Textarea, Button } from '@ishoot/ui';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function ContactForm() {
  const { t, locale, isRTL } = useTranslation();

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [services, setServices] = React.useState<string[]>(['Commercial Cinematography']);
  const [budget, setBudget] = React.useState('2,000 – 5,000 BHD');
  const [timeline, setTimeline] = React.useState('');
  const [message, setMessage] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          company,
          services,
          budget,
          timeline,
          message,
          locale,
        }),
      });

      if (!res.ok) throw new Error('Submission failed');

      setStatus('success');
      // Reset form fields
      setFullName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setMessage('');
      setTimeline('');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-[#0B1210] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl">
      {/* Status Notifications */}
      {status === 'success' && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold">{t('contact.successTitle')}</div>
            <div className="text-emerald-300/80 mt-1">{t('contact.successMessage')}</div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold">{t('contact.errorTitle')}</div>
            <div className="text-rose-300/80 mt-1">{t('contact.errorMessage')}</div>
          </div>
        </div>
      )}

      {/* Services Required */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-white uppercase tracking-wider block">
          {t('contact.servicesNeeded')}
        </label>
        <ServicePills selected={services} onChange={setServices} isRTL={isRTL} />
      </div>

      {/* Anticipated Budget */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-white uppercase tracking-wider block">
          {t('contact.budgetRange')}
        </label>
        <BudgetSelector selected={budget} onChange={setBudget} />
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs text-[#9EADA9] font-medium block">
            {t('contact.fullName')} *
          </label>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Sayed Ahmed"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[#9EADA9] font-medium block">
            {t('contact.email')} *
          </label>
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[#9EADA9] font-medium block">
            {t('contact.phone')}
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+973 3900 0000"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[#9EADA9] font-medium block">
            {t('contact.company')}
          </label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Batelco / Agency"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <label className="text-xs text-[#9EADA9] font-medium block">
          {t('contact.timeline')}
        </label>
        <Input
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          placeholder={isRTL ? 'مثال: نوفمبر ٢٠٢٦' : 'e.g. November 2026'}
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label className="text-xs text-[#9EADA9] font-medium block">
          {t('contact.projectDetails')} *
        </label>
        <Textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isRTL ? 'اشرح لنا رؤيتك الإنتاجية، المواقع المحددة، ومخرجات التسليم المطلوبة...' : 'Tell us about your campaign goals, shoot locations, and desired deliverables...'}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {loading ? t('contact.submitting') : t('contact.submit')}
      </Button>
    </form>
  );
}
