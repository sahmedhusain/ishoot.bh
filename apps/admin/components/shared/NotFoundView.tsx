"use client";

import Link from "next/link";
import { FileQuestion, Home, FileText, Receipt, Calendar, CreditCard, Box, Users } from "lucide-react";
import { ROUTES } from "@platform/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NotFoundView() {
  const { t, locale } = useAdminLocale();
  const isAr = locale === "ar";

  const quickLinks = [
    { href: ROUTES.invoices.list, label: isAr ? "الفواتير" : "Invoices", icon: FileText },
    { href: ROUTES.quotations.list, label: isAr ? "عروض الأسعار" : "Quotations", icon: Receipt },
    { href: ROUTES.moms.list, label: isAr ? "محاضر الاجتماعات" : "Meeting Minutes", icon: Calendar },
    { href: ROUTES.payments.list, label: isAr ? "سندات القبض" : "Payments", icon: CreditCard },
    { href: ROUTES.assets.list(), label: isAr ? "الأصول والمعدات" : "Assets Vault", icon: Box },
    { href: ROUTES.directory, label: isAr ? "دليل الموظفين" : "Directory", icon: Users },
  ];

  return (
    <main
      className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center p-6 text-center"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xl p-8 sm:p-10 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-inner">
            <FileQuestion className="h-8 w-8" aria-hidden />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold uppercase tracking-wider">
            {isAr ? "رمز الخطأ: 404 · غير موجود" : "ERROR CODE: 404 · NOT FOUND"}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {isAr ? "الوثيقة أو الصفحة المطلوبة غير متوفرة" : t.notFound?.title || "Document or Resource Not Found"}
          </h1>

          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {isAr
              ? "لم يتم العثور على هذا السجل أو قد يكون تم نقله أو حذفه أو أنك لا تملك صلاحية الوصول إليه."
              : t.notFound?.body || "The document ID or URL you requested does not exist, was moved, or has been archived."}
          </p>
        </div>

        {/* Quick jump to core documents */}
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            {isAr ? "الانتقال السريع إلى السجلات:" : "Jump directly to records:"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Return button */}
        <div className="pt-2">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95 shadow-sm transition-all"
          >
            <Home className="h-4 w-4" />
            <span>{isAr ? "العودة للرئيسية" : t.notFound?.back || "Return to Dashboard"}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
