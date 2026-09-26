'use client';

import * as React from 'react';
import { useLocale } from '../../hooks/useLocale';
import { Star, Quote } from 'lucide-react';

export function StarscastingReviews() {
  const { locale, isRTL } = useLocale();

  const reviews = [
    {
      id: '1',
      client: 'National Bank of Bahrain (NBB)',
      clientAr: 'بنك البحرين الوطني',
      author: 'Head of Brand & Communications',
      authorAr: 'رئيس الاتصالات المؤسسية والهوية',
      quoteEn: '“ishoot elevated our national campaign into a cinematic experience that resonated across the entire Kingdom. The lighting, 8K RED optics, and post-production grade exceeded all executive expectations.”',
      quoteAr: '“نقل فريق آي شوت حملتنا الوطنية إلى تجربة سينمائية استثنائية لاقت صدى واسعاً في المملكة. الإضاءة، وعدسات 8K، وتصحيح الألوان فاق كل التوقعات.”',
      year: '2026',
    },
    {
      id: '2',
      client: 'Bapco Energies',
      clientAr: 'بابكو إنرجيز',
      author: 'Corporate Sustainability Director',
      authorAr: 'مدير الاستدامة والشؤون المؤسسية',
      quoteEn: '“The aerial drone execution across our offshore and industrial sites was flawless. Their attention to safety and Hollywood-standard cinematography is unmatched in Bahrain.”',
      quoteAr: '“التصوير الجوي في مواقعنا الصناعية والبحرية كان في قمة الاحتراف والدقة. التزامهم بمعايير السلامة والتصوير السينمائي لا مثيل له في البحرين.”',
      year: '2026',
    },
    {
      id: '3',
      client: 'Batelco Beyon',
      clientAr: 'بتلكو بيون',
      author: 'Digital Marketing & Content Lead',
      authorAr: 'مدير التسويق الرقمي والمحتوى',
      quoteEn: '“Fast turnaround, visionary storytelling, and unmatched equipment. Sayed and his team bring true director-level craft to commercial production.”',
      quoteAr: '“سرعة في الإنجاز، وسرد بصري ملهم، ومعدات تصوير متطورة جداً. سيد وفريقه يقدمون رؤية إخراجية سينمائية حقيقية لأي إعلان تجاري.”',
      year: '2025',
    },
  ];

  return (
    <section id="reviews" className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5">
      <div className="shell space-y-16">
        {/* Editorial Index Header: — (05) (Testimonials) © 2026 — */}
        <div className="relative w-full">
          <span
            aria-hidden="true"
            className="block h-px w-full bg-white/10"
          />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>(05)</span>
            </span>
            <span className="font-bold text-white">
              ({isRTL ? 'شهادات العملاء والشركاء' : 'Client Testimonials'})
            </span>
            <span>© 2026</span>
          </div>
        </div>

        {/* Heading */}
        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            {isRTL ? 'ثقة كبرى العلامات التجارية' : 'Trusted by Market Leaders'}
          </h2>
          <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
            {isRTL
              ? 'نفخر بإنتاج أعمال سينمائية صنعت فارقاً حقيقياً في الصورة الذهنية لشركائنا.'
              : 'Our commitment to visual perfection has built enduring partnerships with Bahrain’s most prestigious organizations.'}
          </p>
        </div>

        {/* 3 Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 p-8 space-y-6 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-emerald-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                {/* Quote Text */}
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans italic">
                  {isRTL ? rev.quoteAr : rev.quoteEn}
                </p>
              </div>

              {/* Author & Client Details */}
              <div className="pt-4 border-t border-white/5 space-y-1">
                <div className="text-xs font-bold text-white font-sans">
                  {isRTL ? rev.clientAr : rev.client}
                </div>
                <div className="text-[11px] text-[#9EADA9] font-sans">
                  {isRTL ? rev.authorAr : rev.author}
                </div>
                <div className="text-[10px] font-mono text-[#09937F]">
                  BAHRAIN · {rev.year}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
