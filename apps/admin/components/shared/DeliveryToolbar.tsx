'use client';

import * as React from 'react';
import { Button } from '@ishoot/ui';
import { Mail, MessageCircle, Printer, Download, Check } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface DeliveryToolbarProps {
  documentType: 'invoice' | 'receipt';
  documentNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  amountFormatted: string;
  onSendEmail?: () => Promise<void>;
  className?: string;
}

export function DeliveryToolbar({
  documentType,
  documentNumber,
  clientName,
  clientEmail,
  clientPhone,
  amountFormatted,
  onSendEmail,
  className = '',
}: DeliveryToolbarProps) {
  const { t, locale } = useAdminLocale();
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const handleEmail = async () => {
    if (onSendEmail) {
      setEmailSending(true);
      try {
        await onSendEmail();
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } catch (err) {
        console.error(err);
      } finally {
        setEmailSending(false);
      }
    } else {
      // Direct mailto fallback
      const docLabel = documentType === 'invoice'
        ? (locale === 'ar' ? 'فاتورة' : 'INVOICE')
        : (locale === 'ar' ? 'إيصال سداد' : 'RECEIPT');
      const subject = encodeURIComponent(`${docLabel} ${documentNumber} - ishoot`);
      const body = encodeURIComponent(
        locale === 'ar'
          ? `عزيزنا ${clientName}،\n\nيرجى الاطلاع على مستند ${docLabel} رقم ${documentNumber} بمبلغ ${amountFormatted}.\n\nمع التحية،\nشركة آي شوت للإنتاج السينمائي`
          : `Dear ${clientName},\n\nPlease find your ${documentType} ${documentNumber} for ${amountFormatted}.\n\nWarm regards,\nishoot Production`
      );
      window.open(`mailto:${clientEmail || ''}?subject=${subject}&body=${body}`);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    }
  };

  const handleWhatsApp = () => {
    const cleanPhone = (clientPhone || '').replace(/[^0-9]/g, '');
    const docLabel = documentType === 'invoice'
      ? (locale === 'ar' ? 'فاتورة' : 'INVOICE')
      : (locale === 'ar' ? 'إيصال سداد' : 'RECEIPT');

    const message = encodeURIComponent(
      locale === 'ar'
        ? `مرحباً ${clientName}،\n\nنرفق لكم مستند ${docLabel} رقم *${documentNumber}* من *آي شوت للإنتاج السينمائي* بمبلغ *${amountFormatted}*.\n\nشكراً لتعاملكم معنا.`
        : `Hello ${clientName},\n\nPlease find your official ${documentType.toUpperCase()} *${documentNumber}* from *ishoot Cinema Production* in the amount of *${amountFormatted}*.\n\nThank you for choosing ishoot.`
    );
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 p-4 bg-[#0B1210] border border-white/10 rounded-2xl shadow-xl ${className}`}>
      {/* 1. Send via Email */}
      <Button
        variant={emailSent ? 'secondary' : 'primary'}
        size="sm"
        disabled={emailSending}
        onClick={handleEmail}
        className="gap-2"
      >
        {emailSent ? <Check className="w-4 h-4 text-emerald-400" /> : <Mail className="w-4 h-4" />}
        <span>
          {emailSending
            ? (locale === 'ar' ? 'جارٍ الإرسال...' : 'Dispatching...')
            : emailSent
            ? (locale === 'ar' ? 'تم الإرسال بنجاح!' : 'Email Dispatched!')
            : (locale === 'ar' ? 'إرسال بالبريد' : 'Send via Email')}
        </span>
      </Button>

      {/* 2. Send via WhatsApp (Direct wa.me) */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleWhatsApp}
        className="gap-2 hover:border-[#25D366]/40 hover:text-[#25D366]"
      >
        <MessageCircle className="w-4 h-4 text-[#25D366]" />
        <span>{locale === 'ar' ? 'إرسال عبر واتساب' : 'WhatsApp Dispatch'}</span>
      </Button>

      {/* 3. Print A4 */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handlePrint}
        className="gap-2"
      >
        <Printer className="w-4 h-4 text-[#9EADA9]" />
        <span>{locale === 'ar' ? 'طباعة المستند' : 'Print Document'}</span>
      </Button>

      {/* 4. Direct Download */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handlePrint}
        className="gap-2"
      >
        <Download className="w-4 h-4 text-[#9EADA9]" />
        <span>{locale === 'ar' ? 'حفظ كملف PDF' : 'Save PDF'}</span>
      </Button>
    </div>
  );
}
