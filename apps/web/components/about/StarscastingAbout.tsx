'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale } from '../../hooks/useLocale';
import { ArrowUpRight, Film, Target, Eye, Sparkles } from 'lucide-react';

interface StarscastingAboutProps {
  clientLogos?: any[];
}

export function StarscastingAbout({ clientLogos = [] }: StarscastingAboutProps) {
  const { locale, isRTL } = useLocale();

  return (
    <section id="about" className="katana-top relative z-[2] bg-[#F8FAFC] text-[#0F172A] select-none">
      <div className="shell pb-[clamp(5rem,10vh,8rem)] pt-[clamp(6rem,12vh,10rem)]">
        {/* Editorial Index Header: — (01) (About Us) © 2026 — */}
        <div className="relative w-full">
          <span
            aria-hidden="true"
            className="block h-px w-full bg-slate-300"
          />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#014842]" />
              <span>(01)</span>
            </span>
            <span className="font-bold text-slate-800">
              ({isRTL ? 'من نحن' : 'About ishoot'})
            </span>
            <span>© 2026</span>
          </div>
        </div>

        {/* Massive Editorial Headline */}
        <div className="mt-[clamp(3rem,6vh,5rem)] max-w-5xl">
          <h2 className="font-display text-[clamp(2rem,4.5vw,4.25rem)] leading-[1.05] tracking-tight font-bold text-slate-950">
            {isRTL
              ? 'دار إنتاج سينمائي بحرينية تصنع من الرؤى الطموحة تحفاً بصرية تخلد العلامات التجارية.'
              : 'A Bahraini Cinema Production House turning ambitious visions into high-impact cinematic masterpieces.'}
          </h2>
          <p className="mt-6 font-sans text-[clamp(1.1rem,2vw,1.6rem)] leading-relaxed text-slate-600 max-w-3xl">
            {isRTL
              ? 'من قلب المنامة إلى كبرى شاشات الخليج والعالم، نمزج بين كاميرات السينما العالمية ورؤية إخراجية معاصرة تلامس الوجدان.'
              : 'From the heart of Manama to premier global screens, we fuse international cinema optics with deep cultural artistry.'}
          </p>
        </div>

        {/* Two-Column Grid: Featured Frame + Mission & Vision */}
        <div className="mt-[clamp(3.5rem,8vh,6rem)] grid gap-10 lg:grid-cols-[minmax(0,440px)_1fr] items-center">
          {/* Featured Production Still */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl group">
            <img
              src="/banners/Web Banner 04.jpg"
              alt="ishoot Cinema Production"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#5EEAD4] block">
                {isRTL ? 'خلف الكواليس · موقع التصوير' : 'BEHIND THE SCENES · ON LOCATION'}
              </span>
              <p className="text-sm font-bold font-sans">
                {isRTL ? 'طاقم آي شوت أثناء تصوير إعلان سينمائي بدقة 8K' : 'ishoot dual-camera crew on commercial 8K shoot'}
              </p>
            </div>
          </div>

          {/* Mission, Vision & Highlights */}
          <div className="flex flex-col space-y-6">
            {/* Mission */}
            <div className="border-t border-slate-200 pt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#014842] uppercase tracking-widest">
                <Target className="w-4 h-4 text-[#09937F]" />
                <span>({isRTL ? 'الرسالة' : 'Mission'})</span>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-slate-700 max-w-xl">
                {isRTL
                  ? 'تمكين المؤسسات والعلامات التجارية الرائدة من سرد قصصها بأعلى معايير الدقة والجمال السينمائي، دون أي تنازل عن الجودة.'
                  : 'Empowering visionary brands to tell their stories with uncompromising cinematic beauty, native 8K resolution, and emotional gravity.'}
              </p>
            </div>

            {/* Vision */}
            <div className="border-t border-slate-200 pt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#014842] uppercase tracking-widest">
                <Eye className="w-4 h-4 text-[#09937F]" />
                <span>({isRTL ? 'الرؤية' : 'Vision'})</span>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-slate-700 max-w-xl">
                {isRTL
                  ? 'أن نكون الوجهة الأولى في مملكة البحرين والخليج العربي للإنتاج الإعلاني والسينمائي، ومصدر إلهام لصناع الأفلام في المنطقة.'
                  : 'To stand as the Kingdom of Bahrain’s undisputed creative benchmark for commercial and feature cinematography across the Gulf.'}
              </p>
            </div>

            {/* Action Link */}
            <div className="pt-4">
              <Link
                href={`/${locale}/about`}
                className="group inline-flex items-center gap-2 font-mono text-sm font-bold text-[#014842] hover:text-[#09937F] transition-colors"
              >
                <span>{isRTL ? 'تعرف على قصة الاستوديو وفريق العمل' : 'Discover Our Studio Story & Team'}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
