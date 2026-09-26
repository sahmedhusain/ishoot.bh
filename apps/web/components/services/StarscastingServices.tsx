'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale } from '../../hooks/useLocale';
import { Film, Compass, Palette, Building, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export function StarscastingServices() {
  const { locale, isRTL } = useLocale();

  const services = [
    {
      id: 'commercials',
      number: '01',
      icon: Film,
      titleEn: 'Commercial & Brand Anthems',
      titleAr: 'إعلانات سينمائية للعلامات التجارية',
      descEn: 'Full-scale commercial production engineered for television, cinema, and digital brand campaigns with Hollywood-grade optics.',
      descAr: 'إنتاج إعلانات تجارية متكاملة مخصصة للبث التلفزيوني والسينمائي وحملات العلامات التجارية بأعلى المعايير البصرية.',
      specs: ['RED V-Raptor XL 8K', 'ARRI Master Primes T1.3', 'Full Cinema G&E Crew'],
      specsAr: ['كاميرات ريد 8K', 'طقم عدسات آري T1.3', 'طاقم إضاءة وتصوير كامل'],
      image: '/banners/Youtube cover-02.jpg',
    },
    {
      id: 'aerial',
      number: '02',
      icon: Compass,
      titleEn: 'Heavy-Lift & FPV Aerial Capture',
      titleAr: 'تصوير جوي سينمائي وFPV احترافي',
      descEn: 'Licensed Bahrain civil aviation drone operations capturing monumental landscapes, industrial sites, and dynamic vehicular chases.',
      descAr: 'عمليات تصوير جوي مرخصة من شؤون الطيران المدني لتوثيق المشاريع المعمارية والصناعية ومطاردات السيارات الحماسية.',
      specs: ['Heavy-Lift RED Drone', 'Custom FPV Pro Rigs', 'Dual-Operator Control'],
      specsAr: ['طائرات درون تحمل ريد', 'طائرات FPV سريعة', 'تحكم ثنائي بالملاحة والكاميرا'],
      image: '/banners/Youtube cover-03.jpg',
    },
    {
      id: 'color',
      number: '03',
      icon: Palette,
      titleEn: 'DaVinci Resolve HDR Color Grading',
      titleAr: 'تصحيح ألوان سينمائي في استوديو دافينشي',
      descEn: 'Dedicated post-production color suite equipped with reference OLED mastering displays for true cinema DCI-P3 color fidelity.',
      descAr: 'استوديو تصحيح ألوان متقدم مزود بشاشات ماسترينغ سينمائية لمعايرة الألوان السينمائية وتصدير ماستر 4K/HDR.',
      specs: ['DaVinci Studio Cloud', 'Sony BVM Reference Monitor', 'ACES & Dolby Vision'],
      specsAr: ['سحابة دافينشي ستوديو', 'شاشة مرجعية سوني', 'معايرة دولبي فيجن وACES'],
      image: '/banners/Youtube cover-04.jpg',
    },
    {
      id: 'soundstage',
      number: '04',
      icon: Building,
      titleEn: 'Acoustic Soundstage & Cyclorama',
      titleAr: 'استوديو تصوير عازل للصوت مع سايك مقوس',
      descEn: '250m² soundproof facility in Seef District with 60kW 3-phase power, 6m overhead lighting grid, and infinite curve cyclorama.',
      descAr: 'استوديو معزول صوتياً بمساحة 250 متر مربع في ضاحية السيف مع شبكة إضاءة علوية وقوس إنفينيتي أبيض وأخضر.',
      specs: ['250m² Soundstage', 'Overhead Lighting Grid', 'Soundproof Control Booth'],
      specsAr: ['مساحة 250 م²', 'شبكة إضاءة علوية مسبقة', 'غرفة تحكم معزولة صوتياً'],
      image: '/banners/Web Banner 04.jpg',
    },
  ];

  return (
    <section id="services" className="relative py-28 bg-[#050807] text-[#F2F6F5] select-none border-t border-white/5">
      <div className="shell space-y-16">
        {/* Editorial Index Header: — (02) (Capabilities) © 2026 — */}
        <div className="relative w-full">
          <span
            aria-hidden="true"
            className="block h-px w-full bg-white/10"
          />
          <div className="mt-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#9EADA9]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#09937F]" />
              <span>(02)</span>
            </span>
            <span className="font-bold text-white">
              ({isRTL ? 'القدرات والخدمات الإنتاجية' : 'Production Capabilities'})
            </span>
            <span>© 2026</span>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
              {isRTL ? 'قدرات سينمائية بلا حدود' : 'Cinema Engineering & Craft'}
            </h2>
            <p className="text-sm sm:text-base text-[#9EADA9] leading-relaxed">
              {isRTL
                ? 'نوفر منظومة إنتاج سينمائي متكاملة من الفكرة والسيناريو، إلى التصوير بكاميرات 8K، وتصحيح الألوان في الاستوديو.'
                : 'End-to-end cinematic ecosystem from script development and 8K capture to precision color science and final master delivery.'}
            </p>
          </div>

          <Link
            href={`/${locale}/contact`}
            className="group inline-flex items-center gap-2 font-mono text-xs font-bold text-[#09937F] hover:text-[#5EEAD4] transition-colors"
          >
            <span>{isRTL ? 'طلب تسعير إنتاجي مخصص' : 'Request Production Proposal'}</span>
            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* 4 Interactive Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group relative rounded-3xl bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 overflow-hidden flex flex-col justify-between shadow-2xl p-7 sm:p-9 space-y-8"
              >
                {/* Background Ambient Image Preview on Hover */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-15 transition-opacity duration-700 ease-out -z-0"
                  style={{ backgroundImage: `url('${item.image}')` }}
                />

                <div className="relative z-10 space-y-6">
                  {/* Top Bar: Icon + Number Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-[#5EEAD4] shadow-lg group-hover:rotate-6 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs text-[#9EADA9] font-bold">
                      ({item.number})
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-[#5EEAD4] transition-colors">
                      {isRTL ? item.titleAr : item.titleEn}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9EADA9] leading-relaxed">
                      {isRTL ? item.descAr : item.descEn}
                    </p>
                  </div>
                </div>

                {/* Specs Badges */}
                <div className="relative z-10 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
                  {(isRTL ? item.specsAr : item.specs).map((spec, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-white/5 text-[#9EADA9] border border-white/10 group-hover:border-[#09937F]/30 group-hover:text-white transition-colors"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
