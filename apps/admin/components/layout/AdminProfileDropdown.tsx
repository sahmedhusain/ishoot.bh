'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  User,
  Shield,
  Building2,
  Sliders,
  History,
  LogOut,
  ChevronDown,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { useAdminTheme } from '../../hooks/useAdminTheme';

export function AdminProfileDropdown() {
  const { t, locale, isRTL } = useAdminLocale();
  const { theme, resolvedTheme } = useAdminTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = () => {
    if (confirm(locale === 'ar' ? 'هل تود تسجيل الخروج من لوحة التحكم؟' : 'Are you sure you want to sign out?')) {
      window.location.href = '/';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 ps-2 border-s border-white/10 hover:opacity-90 transition-opacity focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-xs font-bold text-white font-mono shadow-sm">
          SA
        </div>
        <div className="hidden xl:block text-start leading-tight">
          <div className="text-xs font-bold text-white flex items-center gap-1">
            <span>{locale === 'ar' ? 'سيد أحمد حسين' : 'Sayed Ahmed Husain'}</span>
            <ChevronDown className={`w-3 h-3 text-[#9EADA9] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
          <div className="text-[10px] text-[#09937F] font-semibold font-mono">
            {locale === 'ar' ? 'المدير العام' : 'Super Admin'}
          </div>
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-72 rounded-2xl bg-[#0B1210] border border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col ${
            isRTL ? 'left-0 sm:left-auto sm:right-0' : 'right-0 sm:right-auto sm:left-0'
          }`}
        >
          {/* Header Profile Identity */}
          <div className="p-4 bg-white/[0.02] border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#014842] border border-[#09937F]/50 flex items-center justify-center text-sm font-bold text-white font-mono shrink-0 shadow-md">
                SA
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {locale === 'ar' ? 'سيد أحمد حسين' : 'Sayed Ahmed Husain'}
                </div>
                <div className="text-[11px] text-[#9EADA9] font-mono truncate">
                  sayed@ishoot.bh
                </div>
                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#09937F]/15 text-[#09937F] border border-[#09937F]/30">
                  <Shield className="w-2.5 h-2.5" />
                  <span>{locale === 'ar' ? 'مدير النظام العام' : 'Super Admin'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Menu Links */}
          <div className="p-2 space-y-0.5 text-xs">
            <Link
              href="/dashboard/users"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#9EADA9] hover:text-white hover:bg-white/5 transition-colors"
            >
              <User className="w-4 h-4 text-[#09937F]" />
              <span>{locale === 'ar' ? 'ملف المستخدم والصلاحيات' : 'User Profile & Privileges'}</span>
            </Link>

            <Link
              href="/dashboard/settings/company"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#9EADA9] hover:text-white hover:bg-white/5 transition-colors"
            >
              <Building2 className="w-4 h-4 text-[#09937F]" />
              <span>{locale === 'ar' ? 'بيانات الشركة والضرائب' : 'Company & Tax Settings'}</span>
            </Link>

            <Link
              href="/dashboard/settings/preferences"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#9EADA9] hover:text-white hover:bg-white/5 transition-colors"
            >
              <Sliders className="w-4 h-4 text-[#09937F]" />
              <div className="flex-1 flex items-center justify-between">
                <span>{locale === 'ar' ? 'المظهر واللغة' : 'Appearance & Language'}</span>
                <span className="text-[10px] font-mono text-[#09937F] bg-[#09937F]/10 px-1.5 py-0.5 rounded">
                  {resolvedTheme === 'dark' ? (locale === 'ar' ? 'داكن' : 'Dark') : (locale === 'ar' ? 'فاتح' : 'Light')}
                </span>
              </div>
            </Link>

            <Link
              href="/dashboard/settings/audit"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#9EADA9] hover:text-white hover:bg-white/5 transition-colors"
            >
              <History className="w-4 h-4 text-[#09937F]" />
              <span>{locale === 'ar' ? 'سجل العمليات وتسجيل الدخول' : 'Audit Trail & Login History'}</span>
            </Link>
          </div>

          {/* Database & Infrastructure Status */}
          <div className="p-3 border-t border-white/10 bg-white/[0.01] text-[10px] font-mono text-[#9EADA9] space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#09937F]" />
                <span>Supabase PostgreSQL</span>
              </span>
              <span className="text-emerald-400 font-bold">Connected</span>
            </div>
            <div className="text-[9px] text-[#9EADA9]/60">
              {locale === 'ar' ? 'نظام سحابي دون خوادم Docker' : 'Serverless Cloud Architecture'}
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="p-2 border-t border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{locale === 'ar' ? 'تسجيل الخروج من الجلسة' : 'Sign Out of Session'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
