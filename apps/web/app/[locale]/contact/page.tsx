import * as React from 'react';
import { getTranslations, Locale } from '@ishoot/locales';
import { SectionBadge } from '../../../components/shared/SectionBadge';
import { ContactForm } from '../../../components/contact/ContactForm';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);
  const isRTL = locale === 'ar';

  return (
    <div className="py-20 max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <SectionBadge>{t.contact.badge}</SectionBadge>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display">
          {t.contact.title}
        </h1>
        <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
          {t.contact.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Contact Info Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0B1210] border border-white/10 rounded-3xl p-8 space-y-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {isRTL ? 'معلومات الاستوديو' : 'Studio Information'}
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#09937F] shrink-0 mt-0.5" />
                <span className="text-[#9EADA9]">
                  {isRTL
                    ? 'ضاحية السيف، المنامة، مملكة البحرين'
                    : 'Seef District, Manama, Kingdom of Bahrain'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#09937F] shrink-0" />
                <a
                  href="mailto:hello@ishoot.bh"
                  className="text-[#9EADA9] hover:text-[#09937F] transition-colors"
                >
                  hello@ishoot.bh
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#09937F] shrink-0" />
                <a
                  href="tel:+97317000000"
                  className="text-[#9EADA9] hover:text-[#09937F] transition-colors font-mono"
                >
                  +973 1700 0000
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#09937F] shrink-0" />
                <span className="text-[#9EADA9]">
                  {isRTL ? 'الأحد – الخميس: ٩:٠٠ ص – ٦:٠٠ م' : 'Sun – Thu: 9:00 AM – 6:00 PM'}
                </span>
              </div>
            </div>
          </div>

          {/* Rapid WhatsApp Concierge */}
          <div className="bg-gradient-to-br from-[#014842]/40 to-[#0B1210] border border-[#09937F]/30 rounded-3xl p-8 space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#09937F]">
              {isRTL ? 'استجابة فورية' : 'Immediate Response'}
            </div>
            <div className="text-xl font-bold text-white">
              {isRTL ? 'محادثة مباشرة عبر واتساب' : 'Direct WhatsApp Concierge'}
            </div>
            <p className="text-xs text-[#9EADA9]">
              {isRTL
                ? 'تواصل مباشرة مع أحد منتجينا عبر تطبيق واتساب للحصول على استجابة سريعة.'
                : 'Connect directly with one of our producers on WhatsApp for quick inquiries.'}
            </p>
            <a
              href="https://wa.me/97339000000?text=Hello%20ishoot%20team,%20I%20would%20like%20to%20inquire%20about%20a%20production%20project."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm font-semibold text-[#09937F] hover:text-[#0BB49B] transition-colors"
            >
              {isRTL ? 'فتح محادثة واتساب ←' : 'Open WhatsApp Chat →'}
            </a>
          </div>
        </div>

        {/* Form Container */}
        <div className="lg:col-span-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
