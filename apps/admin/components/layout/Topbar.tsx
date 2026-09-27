"use client";

import * as React from "react";
import Link from "next/link";
import { BreadcrumbTrail } from "./BreadcrumbTrail";
import { ExternalLink, Calendar, Sun, Moon } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme } from "../../hooks/useAdminTheme";
import { NotificationCenter } from "./NotificationCenter";
import { AdminProfileDropdown } from "./AdminProfileDropdown";
import { GlobalQuickJump } from "./GlobalQuickJump";
import type { CRMContact } from "@ishoot/database/types";

interface TopbarProps {
  contacts: CRMContact[];
}

export function Topbar({ contacts }: TopbarProps) {
  const { t, locale } = useAdminLocale();
  const { resolvedTheme, setTheme } = useAdminTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header
      data-topbar
      className="h-16 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#070C0A]/95 backdrop-blur-xl px-5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm dark:shadow-xl transition-colors duration-200"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 sm:hidden">
          <img
            src="/icon.svg"
            alt="ishoot"
            className="w-7 h-7 object-contain"
          />
        </div>

        <div className="hidden sm:block">
          <BreadcrumbTrail />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Quick-Jump (Cmd+K) Universal Search */}
        <GlobalQuickJump />

        {/* 1-Click Dark / Light Mode Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200/70 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 transition-colors"
          title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
          aria-label="Toggle Theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#014842]" />
          )}
        </button>

        <Link
          href="/dashboard/calendar"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#09937F]/15 border border-slate-200 hover:border-[#09937F]/40 text-xs font-semibold text-slate-600 hover:text-[#09937F] dark:bg-white/5 dark:border-white/10 dark:text-[#9EADA9] dark:hover:text-[#09937F] transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{t.nav.calendar}</span>
        </Link>

        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-[#9EADA9] dark:hover:text-white transition-colors"
          title={t.actions.liveSite}
        >
          <span>{t.actions.liveSite}</span>
          <ExternalLink className="w-3 h-3 text-[#09937F]" />
        </a>

        <NotificationCenter />

        <AdminProfileDropdown />
      </div>
    </header>
  );
}
