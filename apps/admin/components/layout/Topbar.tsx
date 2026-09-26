'use client';

import * as React from 'react';
import Link from 'next/link';
import { BreadcrumbTrail } from './BreadcrumbTrail';
import { Search, Bell, ExternalLink, Calendar, Globe, Shield } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

export function Topbar() {
  const { t, locale, setLocale, isRTL } = useAdminLocale();

  const toggleLanguage = () => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#070C0A]/95 backdrop-blur-xl px-5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xl">
      {/* Start: Brand Aperture + Wordmark (SVG only, not normal text) & Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Topbar Logo: Aperture Icon + Wordmark SVG */}
        <div className="flex items-center gap-2.5 sm:hidden">
          <img
            src="/icon.svg"
            alt="ishoot"
            className="w-7 h-7 object-contain"
          />
          <img
            src="/images/logo-color.svg"
            alt="ishoot"
            className="h-4 w-auto object-contain brightness-110"
          />
        </div>

        <div className="hidden sm:block">
          <BreadcrumbTrail />
        </div>
      </div>

      {/* End: Quick Actions & Language Toggle */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#9EADA9]">
          <Search className="w-3.5 h-3.5 text-[#9EADA9]" />
          <span>{t.actions.search}</span>
          <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-[#9EADA9] border border-white/10">⌘K</kbd>
        </div>

        {/* Quick Calendar Link */}
        <Link
          href="/dashboard/calendar"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#09937F]/15 border border-white/10 hover:border-[#09937F]/40 text-xs font-semibold text-[#9EADA9] hover:text-[#09937F] transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{t.nav.calendar}</span>
        </Link>

        {/* Language Switcher (Instant Pure Arabic / Pure English) */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all group"
          title={locale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
        >
          <Globe className="w-3.5 h-3.5 text-[#09937F] group-hover:rotate-45 transition-transform" />
          <span>{locale === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        {/* View Live Public Site */}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#9EADA9] hover:text-white transition-colors"
          title={t.actions.liveSite}
        >
          <span>{t.actions.liveSite}</span>
          <ExternalLink className="w-3 h-3 text-[#09937F]" />
        </a>

        {/* Notifications */}
        <button
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-white hover:border-[#09937F]/40 transition-colors relative"
          aria-label={t.actions.notifications}
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#09937F] absolute top-2 right-2 ring-2 ring-[#070C0A]" />
        </button>

        {/* User Identity Chip */}
        <div className="flex items-center gap-2.5 ps-2 border-s border-white/10">
          <div className="w-8 h-8 rounded-xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-xs font-bold text-white font-mono shadow-sm">
            SA
          </div>
          <div className="hidden xl:block text-start leading-tight">
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>{locale === 'ar' ? 'سيد أحمد حسين' : 'Sayed Ahmed Husain'}</span>
            </div>
            <div className="text-[10px] text-[#09937F] font-semibold font-mono">
              {locale === 'ar' ? 'المدير العام' : 'Super Admin'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
