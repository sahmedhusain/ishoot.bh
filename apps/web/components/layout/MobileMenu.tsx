'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslation } from '../../hooks/useTranslation';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@ishoot/ui';
import { LanguageSwitcher } from './LanguageSwitcher';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { t, locale, isRTL } = useTranslation();

  const navLinks = [
    { href: `/${locale}`, label: t('nav.home') },
    { href: `/${locale}/works`, label: t('nav.works') },
    { href: `/${locale}/about`, label: t('nav.about') },
    { href: `/${locale}/contact`, label: t('nav.contact') },
  ];

  if (!isOpen) return null;

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#050807]/95 backdrop-blur-2xl p-6 sm:p-10 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}`} onClick={onClose} className="flex items-center gap-2.5">
          <img
            src="/icon.svg"
            alt="ishoot Icon"
            className="h-8 w-auto object-contain"
          />
          <img
            src="/images/logo-color.svg"
            alt="ishoot"
            className="h-6 w-auto object-contain brightness-125"
          />
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:text-[#09937F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-6 my-auto py-8">
        {navLinks.map((link, idx) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="group flex items-center justify-between text-3xl sm:text-4xl font-bold text-[#F2F6F5] hover:text-[#09937F] transition-colors py-2 border-b border-white/5"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <span>{link.label}</span>
            <ArrowIcon className="w-6 h-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#09937F]" />
          </Link>
        ))}
      </nav>

      {/* Bottom CTA */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <Link href={`/${locale}/contact`} onClick={onClose} className="block w-full">
          <Button variant="primary" size="lg" className="w-full">
            {t('nav.bookNow')}
          </Button>
        </Link>
        <div className="text-center text-xs text-[#9EADA9]">
          {isRTL ? 'المنامة، مملكة البحرين' : 'Manama, Kingdom of Bahrain'}
        </div>
      </div>
    </div>
  );
}
