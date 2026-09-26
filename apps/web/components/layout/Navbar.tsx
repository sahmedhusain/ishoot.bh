'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@ishoot/ui';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { Menu } from 'lucide-react';

export function Navbar() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: `/${locale}`, label: t('nav.home') },
    { href: `/${locale}/works`, label: t('nav.works') },
    { href: `/${locale}/about`, label: t('nav.about') },
    { href: `/${locale}/contact`, label: t('nav.contact') },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'py-3 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-sm'
            : 'py-4 bg-white/90 backdrop-blur-md border-b border-slate-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
          {/* Official Brand Logo with Standalone Icon + Typography */}
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 flex items-center justify-center">
              <img
                src="/icon.svg"
                alt="ishoot Icon"
                className="h-9 w-auto object-contain transition-transform group-hover:scale-105 duration-200"
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#014842] font-display">
              {locale === 'ar' ? 'آي شوت' : 'ishoot'}
              <span className="text-[#09937F]">.</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/60 backdrop-blur-md">
            {navLinks.map((link) => {
              const isActive =
                link.href === `/${locale}`
                  ? pathname === `/${locale}`
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#014842] text-white shadow-sm'
                      : 'text-slate-700 hover:text-[#014842] hover:bg-slate-200/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link href={`/${locale}/contact`}>
              <Button variant="primary" size="md" className="bg-[#014842] hover:bg-[#02665D] text-white">
                {t('nav.bookNow')}
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-800 hover:text-[#014842] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
