'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '../../hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { Menu } from 'lucide-react';

export function Navbar() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const isRTL = locale === 'ar';

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'py-3.5 bg-[#050807]/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl'
            : 'py-5 bg-transparent border-b border-transparent'
        }`}
      >
        <div className="shell flex items-center justify-between">
          {/* Logo with Smoothly Rotating 45-degree Aperture on Hover */}
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <div className="relative h-9 w-9 flex items-center justify-center shrink-0">
              <img
                src="/icon.svg"
                alt="ishoot"
                className="h-full w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-45 filter drop-shadow-[0_0_8px_rgba(9,147,127,0.3)]"
              />
            </div>
            <img
              src="/images/logo-color.svg"
              alt="ishoot"
              className="h-6 w-auto object-contain brightness-110"
            />
          </Link>

          {/* Centered Desktop Navigation with Animated Hairline Reveal */}
          <nav className="hidden lg:flex items-center gap-9">
            {navLinks.map((link) => {
              const isActive =
                link.href === `/${locale}`
                  ? pathname === `/${locale}`
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative text-sm tracking-wide font-medium transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-[#9EADA9] hover:text-white'
                  }`}
                >
                  <span className="relative pb-1">
                    {link.label}
                    <span
                      className={`absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left bg-[#09937F] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />

            {/* Starscasting-inspired Morphing Circular CTA Button */}
            <Link
              href={`/${locale}/contact`}
              className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] py-1.5 ps-1.5 pe-5 font-sans text-xs font-semibold text-white transition-all duration-300 hover:bg-white hover:text-black hover:border-white shadow-lg"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#014842] text-white transition-colors duration-500 group-hover:bg-black group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110">
                  <path
                    d={isRTL ? "M19 12H5M5 12L12 19M5 12L12 5" : "M5 12H19M19 12L12 5M19 12L12 19"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>{t('nav.bookNow')}</span>
            </Link>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-3 lg:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={navLinks}
      />
    </>
  );
}
