'use client';

import * as React from 'react';
import Link from 'next/link';
import { BreadcrumbTrail } from './BreadcrumbTrail';
import { ExternalLink, Calendar } from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { NotificationCenter } from './NotificationCenter';
import { AdminProfileDropdown } from './AdminProfileDropdown';

export function Topbar() {
  const { t, locale } = useAdminLocale();

  return (
    <header data-topbar className="h-16 border-b border-white/10 bg-[#070C0A]/95 backdrop-blur-xl px-5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xl transition-colors duration-200">
      {/* Start: Brand Aperture + Wordmark (Mobile only) & Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Topbar Logo: Aperture Icon + Wordmark SVG for mobile */}
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

      {/* End: Quick Shortcuts, Notification Center & Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Calendar Link */}
        <Link
          href="/dashboard/calendar"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#09937F]/15 border border-white/10 hover:border-[#09937F]/40 text-xs font-semibold text-[#9EADA9] hover:text-[#09937F] transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{t.nav.calendar}</span>
        </Link>

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

        {/* Working Notification Center with Popover */}
        <NotificationCenter />

        {/* Admin Profile Dropdown */}
        <AdminProfileDropdown />
      </div>
    </header>
  );
}
