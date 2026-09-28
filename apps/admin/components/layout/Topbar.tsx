"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Sun,
  Moon,
  Menu,
  Globe,
  Search,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme } from "../../hooks/useAdminTheme";
import { NotificationCenter } from "./NotificationCenter";
import { AdminProfileDropdown } from "./AdminProfileDropdown";
import { GlobalQuickJump } from "./GlobalQuickJump";
import { useSidebar } from "./SidebarContext";
import { BrandWordmark } from "../shared/BrandWordmark";
import type { CRMContact } from "@ishoot/database/types";

interface TopbarProps {
  contacts?: CRMContact[];
}

export function Topbar({ contacts = [] }: TopbarProps) {
  const { t } = useAdminLocale();
  const { resolvedTheme, setTheme } = useAdminTheme();
  const { toggleMobileOpen } = useSidebar();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header
      data-topbar
      className="h-14 w-full fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#1f1f1f] border-b border-[#dadce0] dark:border-[#3c4043] px-3 sm:px-4 flex items-center justify-between select-none shadow-[0_1px_2px_0_rgba(60,64,67,0.08)] dark:shadow-none transition-colors duration-150"
    >
      {/* Start: Google-style Hamburger Menu + Official ishoot Brand Lockup */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={toggleMobileOpen}
          className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 group focus:outline-none ps-1 sm:ps-2"
          title="ishoot Admin Console"
        >
          <img
            src="/icon.svg"
            alt="ishoot"
            className="w-6 h-6 object-contain shrink-0"
          />
          <BrandWordmark size="sm" />
        </Link>

        <div className="hidden md:flex items-center gap-2 ms-2">
          <div className="h-4 w-px bg-slate-200 dark:bg-neutral-700" />
          <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Console
          </span>
        </div>
      </div>

      {/* Center: Google Cloud Style Minimalist Search Bar */}
      <div className="flex-1 max-w-xs sm:max-w-md lg:max-w-xl mx-2 sm:mx-6 flex justify-center">
        <GlobalQuickJump className="w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#282a2d] dark:hover:bg-[#35373a] text-slate-500 dark:text-neutral-400 text-xs transition-colors border border-transparent focus-within:border-[#09937F] focus-within:bg-white dark:focus-within:bg-[#1f1f1f] focus-within:shadow-sm justify-between cursor-pointer" />
      </div>

      {/* End: Google Suites Compact Action Cluster */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Calendar Shortcut */}
        <Link
          href="/dashboard/calendar"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          title={t.nav.calendar}
          aria-label={t.nav.calendar}
        >
          <Calendar className="w-4 h-4" />
        </Link>

        {/* Public Website Link */}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full hidden sm:flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          title={t.actions.liveSite}
          aria-label={t.actions.liveSite}
        >
          <Globe className="w-4 h-4" />
        </a>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#014842]" />
          )}
        </button>

        {/* Notifications Popover */}
        <NotificationCenter />

        {/* Subtle Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-neutral-700 mx-1" />

        {/* Google-style Profile Menu */}
        <AdminProfileDropdown />
      </div>
    </header>
  );
}
