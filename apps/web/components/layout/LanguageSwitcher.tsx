'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '../../hooks/useLocale';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, isRTL } = useLocale();
  const pathname = usePathname() || '';

  const targetLocale = locale === 'en' ? 'ar' : 'en';
  // Replace current locale prefix with target locale prefix
  const targetPathname = pathname.startsWith(`/${locale}`)
    ? pathname.replace(`/${locale}`, `/${targetLocale}`)
    : `/${targetLocale}${pathname}`;

  return (
    <Link
      href={targetPathname}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#9EADA9] hover:text-[#09937F] bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
      title={isRTL ? 'Switch to English' : 'التحويل إلى العربية'}
    >
      <Globe className="w-3.5 h-3.5 text-[#09937F]" />
      <span>{locale === 'en' ? 'العربية' : 'EN'}</span>
    </Link>
  );
}
