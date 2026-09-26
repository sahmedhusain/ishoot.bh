'use client';

import * as React from 'react';
import { useLocale } from '../../hooks/useLocale';
import { ChevronDown, HelpCircle } from 'lucide-react';

export function StarscastingFAQ() {
  const { locale, isRTL } = useLocale();
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);

  const faqs = [
    {
      qEn: 'What cinema camera systems and lenses do you shoot with?',
      qAr: 'ما هي أنظمة الكاميرات والعدسات السينمائية التي تعتمدونها في التصوير؟',
      aEn: 'We own and operate native RED V-Raptor XL 8K VistaVision multi-camera systems, ARRI Master Prime T1.3 optics, Cooke Anamorphics, and Sony FX6 packages, backed by heavy-lift cinema drones and DJI Ronin 2 stabilization.',
      aAr: 'نمتلك ونشغل حزم كاميرات RED V-Raptor XL 8K VistaVision متعددة، وأطقم عدسات ARRI Master Primes T1.3، وعدسات Cooke أنامورفيك، بالإضافة إلى مثبتات Ronin 2 وطائرات درون سينمائية مرخصة.',
    },
    {
      qEn: 'How long does a commercial project typically take from concept to final master?',
      qAr: 'كم يستغرق إنتاج الإعلان التجاري عادة من مرحلة الفكرة وحتى التسليم النهائي؟',
      aEn: 'Typical production timelines range from 2 to 4 weeks: 7-10 days for scriptwriting, storyboarding, and location permits; 2-4 production shoot days; and 7-10 days for editing, VFX, DaVinci Resolve color grading, and sound design.',
      aAr: 'تتراوح المدة المعتادة بين أسبوعين إلى 4 أسابيع: 7-10 أيام لمرحلة ما قبل الإنتاج وتصاريح المواقع؛ 2-4 أيام تصوير فعلي؛ و7-10 أيام للمونتاج وتصحيح الألوان السينمائي والمكساج الصوتي.',
    },
    {
      qEn: 'Are aerial drone filming operations fully licensed in the Kingdom of Bahrain?',
      qAr: 'هل عمليات التصوير الجوي بالدرون مرخصة رسمياً في مملكة البحرين؟',
      aEn: 'Yes. All our drone pilots hold official commercial drone licenses certified by the Bahrain Civil Aviation Affairs (BCAA). We manage all necessary security clearances and airspace permits for our clients.',
      aAr: 'نعم، جميع طياري الدرون لدينا حاصلون على تراخيص تجارية معتمدة من شؤون الطيران المدني بمملكة البحرين، ونتولى استخراج جميع التصاريح الأمنية والمجال الجوي لكل مشروع.',
    },
    {
      qEn: 'Can we rent the Soundstage facility or equipment packages separately?',
      qAr: 'هل يمكن استئجار استوديو التصوير (Soundstage) أو معدات الكاميرا بشكل منفصل؟',
      aEn: 'Yes. Our 250m² soundproof Soundstage A with overhead lighting grid and cyclorama in Seef District is available for dry hire or with technical crew, as are our camera, lighting, and grip packages.',
      aAr: 'نعم، استوديو التصوير المعزول صوتياً بمساحة 250 م² في ضاحية السيف مع السايك المقوس وشبكة الإضاءة متاح للاستئجار للشركات والطواقم، وكذلك خزانة كاميرات ومعدات الإضاءة.',
    },
    {
      qEn: 'What are your payment terms and tax invoicing procedures?',
      qAr: 'ما هي شروط الدفع وإجراءات الفواتير الضريبية المعتمدة؟',
      aEn: 'We operate with formal Bahrain CR contracts: typically 50% mobilization advance upon signing, and 50% upon final master approval. We provide official BHD tax invoices with Western Arabic numerals (0-9) and instant receipts.',
      aAr: 'نتعامل بعقود رسمية مسجلة في السجل التجاري: عادة 50% دفعة مقدمة عند توقيع العقد، و50% عند اعتماد النسخة النهائية. نصدر فواتير ضريبية رسمية بالدينار البحريني مع إيصالات سداد فورية.',
    },
  ];

  return (
    <section id="faq" className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5">
      <div className="shell space-y-16">
        {/* Editorial Index Header: — (06) (FAQ) © 2026 — */}
        <div className="relative w-full">
          <span
            aria-hidden="true"
            className="block h-px w-full bg-white/10"
          />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>(06)</span>
            </span>
            <span className="font-bold text-white">
              ({isRTL ? 'الأسئلة الشائعة والاستفسارات' : 'Frequently Asked Questions'})
            </span>
            <span>© 2026</span>
          </div>
        </div>

        {/* Heading */}
        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            {isRTL ? 'كل ما تود معرفته عن الإنتاج' : 'Production Insights & FAQ'}
          </h2>
          <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
            {isRTL
              ? 'إجابات واضحة وشفافة حول سير العمليات، الكاميرات، الجداول الزمنية، والتصاريح.'
              : 'Clear, transparent answers about our production workflows, cinema equipment, and commercial licensing.'}
          </p>
        </div>

        {/* Accordion List */}
        <div className="max-w-4xl mx-auto divide-y divide-white/10">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="py-6 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-start gap-4 group cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-white group-hover:text-[#5EEAD4] transition-colors font-sans">
                    {isRTL ? faq.qAr : faq.qEn}
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#09937F] transition-transform duration-300 ${isOpen ? 'rotate-180 bg-[#014842] text-white' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-4 text-xs sm:text-sm text-[#9EADA9] leading-relaxed font-sans max-w-3xl animate-fade-in">
                    {isRTL ? faq.aAr : faq.aEn}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
