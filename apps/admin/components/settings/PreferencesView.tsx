'use client';

import * as React from 'react';
import { Card, Button, Badge } from '@ishoot/ui';
import {
  Globe,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { useAdminTheme, AdminTheme } from '../../hooks/useAdminTheme';
import { SettingsNavTabs } from './SettingsNavTabs';

export function PreferencesView() {
  const { t, locale, setLocale, isRTL } = useAdminLocale();
  const { theme, resolvedTheme, setTheme } = useAdminTheme();
  const [savedNotification, setSavedNotification] = React.useState<string | null>(null);

  const handleLanguageChange = (newLocale: 'ar' | 'en') => {
    setLocale(newLocale);
    setSavedNotification(
      newLocale === 'ar' ? 'تم ضبط لغة النظام إلى اللغة العربية' : 'Interface language set to English'
    );
    setTimeout(() => setSavedNotification(null), 3000);
  };

  const handleThemeChange = (newTheme: AdminTheme) => {
    setTheme(newTheme);
    const text =
      newTheme === 'dark'
        ? (locale === 'ar' ? 'تم تفعيل الوضع الداكن' : 'Dark mode activated')
        : newTheme === 'light'
        ? (locale === 'ar' ? 'تم تفعيل الوضع الفاتح' : 'Light mode activated')
        : (locale === 'ar' ? 'تم ضبط المظهر لمطابقة نظام الجهاز' : 'System theme sync activated');
    setSavedNotification(text);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Tabs */}
      <SettingsNavTabs />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          {locale === 'ar' ? 'تفضيلات الواجهة والمظهر' : 'Interface & Appearance'}
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">
          {locale === 'ar'
            ? 'تخصيص لغة لوحة التحكم الإدارية بالكامل، وتبديل المظهر بين الوضع الفاتح والداكن، وإعدادات العرض.'
            : 'Customize administrative dashboard language, toggle between light and dark modes, and display preferences.'}
        </p>
      </div>

      {savedNotification && (
        <div className="p-4 rounded-2xl bg-[#09937F]/15 border border-[#09937F]/40 flex items-center gap-3 text-[#09937F] text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNotification}</span>
        </div>
      )}

      {/* 1. Interface Language (اللغة) */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <Globe className="w-5 h-5 text-[#09937F]" />
          <div>
            <h2 className="text-base font-bold text-white">
              {locale === 'ar' ? 'لغة النظام الإداري' : 'System Interface Language'}
            </h2>
            <p className="text-xs text-[#9EADA9]">
              {locale === 'ar'
                ? 'اختر لغة العمل المفضلة. يتم تطبيق الاتجاه (RTL للعربية / LTR للإنجليزية) فورياً.'
                : 'Select your preferred dashboard language. Orientation (RTL/LTR) updates instantly.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Arabic Option */}
          <div
            onClick={() => handleLanguageChange('ar')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              locale === 'ar'
                ? 'bg-[#014842]/20 border-[#09937F] shadow-lg shadow-[#09937F]/10'
                : 'bg-[#050807] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">العربية (اللغة العربية بالكامل)</span>
              {locale === 'ar' && <CheckCircle2 className="w-5 h-5 text-[#09937F]" />}
            </div>
            <p className="text-xs text-[#9EADA9] mt-2 leading-relaxed">
              واجهة مستخدم عربية أصيلة بنسبة 100% مع دعم كامل للاتجاه من اليمين إلى اليسار (RTL) والأرقام الغربية المعتمدة في البحرين والخليج (0-9).
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-[#9EADA9]">
              <span>RTL</span>
              <span>•</span>
              <span>IBM Plex Sans Arabic</span>
            </div>
          </div>

          {/* English Option */}
          <div
            onClick={() => handleLanguageChange('en')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              locale === 'en'
                ? 'bg-[#014842]/20 border-[#09937F] shadow-lg shadow-[#09937F]/10'
                : 'bg-[#050807] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">English (Full English Interface)</span>
              {locale === 'en' && <CheckCircle2 className="w-5 h-5 text-[#09937F]" />}
            </div>
            <p className="text-xs text-[#9EADA9] mt-2 leading-relaxed">
              Complete professional English interface with standard Left-to-Right (LTR) alignment and global cinematography taxonomy.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-[#9EADA9]">
              <span>LTR</span>
              <span>•</span>
              <span>Inter Sans</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Theme Selection (الوضع الداكن والوضع الفاتح) */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 shadow-2xl rounded-3xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <Sparkles className="w-5 h-5 text-[#09937F]" />
          <div>
            <h2 className="text-base font-bold text-white">
              {locale === 'ar' ? 'المظهر العام وسمة الألوان' : 'Color Theme & Appearance'}
            </h2>
            <p className="text-xs text-[#9EADA9]">
              {locale === 'ar'
                ? 'التبديل بين الوضع الداكن المفضل لاستوديوهات المونتاج، والوضع الفاتح ذو التباين العالي للمكاتب الإدارية.'
                : 'Toggle between Studio Dark mode and high-contrast Office Light mode.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Dark Mode */}
          <div
            onClick={() => handleThemeChange('dark')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              theme === 'dark'
                ? 'bg-[#014842]/20 border-[#09937F] shadow-lg shadow-[#09937F]/10'
                : 'bg-[#050807] border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[#09937F]">
                  <Moon className="w-4 h-4" />
                </div>
                {theme === 'dark' && <CheckCircle2 className="w-5 h-5 text-[#09937F]" />}
              </div>
              <div className="text-sm font-bold text-white">
                {locale === 'ar' ? 'الوضع الداكن (السينمائي)' : 'Dark Mode (Cinematic)'}
              </div>
              <p className="text-xs text-[#9EADA9] mt-1.5 leading-relaxed">
                {locale === 'ar'
                  ? 'خلفية سوداء داكنة مستوحاة من غرف تصحيح الألوان واستوديوهات التصوير لتقليل إجهاد العين.'
                  : 'Deep forest black inspired by DaVinci Resolve color grading suites and dark studios.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#050807] border border-white/30" />
              <span className="w-3 h-3 rounded-full bg-[#014842]" />
              <span className="w-3 h-3 rounded-full bg-[#09937F]" />
              <span className="text-[10px] text-[#9EADA9] ms-auto font-mono">#050807</span>
            </div>
          </div>

          {/* Light Mode */}
          <div
            onClick={() => handleThemeChange('light')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              theme === 'light'
                ? 'bg-[#014842]/20 border-[#09937F] shadow-lg shadow-[#09937F]/10'
                : 'bg-[#050807] border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-amber-400">
                  <Sun className="w-4 h-4" />
                </div>
                {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-[#09937F]" />}
              </div>
              <div className="text-sm font-bold text-white">
                {locale === 'ar' ? 'الوضع الفاتح (المكتبي)' : 'Light Mode (Office)'}
              </div>
              <p className="text-xs text-[#9EADA9] mt-1.5 leading-relaxed">
                {locale === 'ar'
                  ? 'مظهر ناصع عالي التباين ووضوح فائق لقراءة الفواتير والتقارير المالية في بيئات العمل المضاءة.'
                  : 'Crisp high-contrast daylight layout designed for executive review, invoicing, and bright workspaces.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F8FAFC] border border-black/20" />
              <span className="w-3 h-3 rounded-full bg-[#FFFFFF] border border-black/20" />
              <span className="w-3 h-3 rounded-full bg-[#09937F]" />
              <span className="text-[10px] text-[#9EADA9] ms-auto font-mono">#F8FAFC</span>
            </div>
          </div>

          {/* System Mode */}
          <div
            onClick={() => handleThemeChange('system')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              theme === 'system'
                ? 'bg-[#014842]/20 border-[#09937F] shadow-lg shadow-[#09937F]/10'
                : 'bg-[#050807] border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[#9EADA9]">
                  <Laptop className="w-4 h-4" />
                </div>
                {theme === 'system' && <CheckCircle2 className="w-5 h-5 text-[#09937F]" />}
              </div>
              <div className="text-sm font-bold text-white">
                {locale === 'ar' ? 'تلقائي (مطابقة النظام)' : 'System Sync (Auto)'}
              </div>
              <p className="text-xs text-[#9EADA9] mt-1.5 leading-relaxed">
                {locale === 'ar'
                  ? 'يتكيف تلقائياً مع تفضيلات مظهر جهاز الكمبيوتر الخاص بك (macOS أو Windows).'
                  : 'Automatically synchronizes with your operating system light/dark schedule.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-[#09937F] font-mono">
              {locale === 'ar' ? 'السمة النشطة حالياً: ' : 'Active: '}
              {resolvedTheme === 'dark' ? (locale === 'ar' ? 'داكن' : 'Dark') : (locale === 'ar' ? 'فاتح' : 'Light')}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Numbering Standard Card */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#09937F] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-white">
            {locale === 'ar' ? 'معيار الأرقام والعملات الرسمي في مملكة البحرين' : 'Official Banking Numerals Standard'}
          </div>
          <p className="text-[#9EADA9] leading-relaxed">
            {locale === 'ar'
              ? 'تعتمد لوحة تحكم آي شوت ونظام الفواتير المعتمد الأرقام العربية الغربية (0, 1, 2, 3...) حصرياً لمنع أي التباس محاسبي أو خلل برمجي، بما يتوافق تماماً مع المعايير المصرفية في مملكة البحرين ومجلس التعاون الخليجي.'
              : 'ishoot administrative systems and tax invoices strictly enforce Western Arabic numerals (0, 1, 2, 3...) in compliance with Kingdom of Bahrain banking regulations and CBB guidelines.'}
          </p>
        </div>
      </div>
    </div>
  );
}
