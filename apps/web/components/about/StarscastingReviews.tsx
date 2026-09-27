'use client';

import * as React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Star } from 'lucide-react';

export function StarscastingReviews() {
  const { t, isRTL } = useTranslation();

  const items = t('reviews.items') as unknown as Array<{
    id: string;
    client: string;
    clientAr: string;
    author: string;
    authorAr: string;
    quoteEn: string;
    quoteAr: string;
    year: string;
  }>;

  return (
    <section id="reviews" className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5">
      <div className="shell space-y-16">
        {/* Editorial Index Header */}
        <div className="relative w-full">
          <span aria-hidden="true" className="block h-px w-full bg-white/10" />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>{t('reviews.sectionIndex')}</span>
            </span>
            <span className="font-bold text-white">
              ({isRTL ? t('reviews.sectionLabelAr') : t('reviews.sectionLabelEn')})
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Heading */}
        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
            {isRTL ? t('reviews.headlineAr') : t('reviews.headlineEn')}
          </h2>
          <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
            {isRTL ? t('reviews.subtitleAr') : t('reviews.subtitleEn')}
          </p>
        </div>

        {/* Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(Array.isArray(items) ? items : []).map((rev) => (
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
                  {t('reviews.bahrain')} · {rev.year}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
