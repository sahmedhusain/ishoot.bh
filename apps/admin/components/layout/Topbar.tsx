"use client";
import { ROUTES } from "../../constants/routes";
import { ContentImage } from "../shared/ContentImage";

import Link from "next/link";
import { Calendar, Sun, Moon, Menu } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme } from "../../hooks/useAdminTheme";
import { usePermissions } from "../../hooks/usePermissions";
import { NotificationCenter } from "./NotificationCenter";
import { AdminProfileDropdown } from "./AdminProfileDropdown";
import { GlobalQuickJump } from "./GlobalQuickJump";
import { useSidebar } from "./SidebarContext";
import type { CRMContact, CompanySettings } from "@ishoot/database/types";

interface TopbarProps {
  contacts?: CRMContact[];
  company?: Pick<
    CompanySettings,
    | "company_name_en"
    | "company_name_ar"
    | "logo_url"
    | "dark_logo_url"
    | "icon_url"
    | "dark_icon_url"
  > | null;
}

export function Topbar({ contacts = [], company }: TopbarProps) {
  const { t, isRTL } = useAdminLocale();
  const { can } = usePermissions();
  const { resolvedTheme, setTheme } = useAdminTheme();
  const { toggleMobileOpen } = useSidebar();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const companyTitle =
    (isRTL ? company?.company_name_ar : company?.company_name_en) || "";

  return (
    <header
      data-topbar
      className="h-14 w-full fixed top-0 start-0 end-0 z-40 bg-white dark:bg-[#1f1f1f] border-b border-ink/15 dark:border-ink/15 px-3 sm:px-4 flex items-center justify-between select-none shadow-[0_1px_2px_0_rgba(60,64,67,0.08)] dark:shadow-none transition-colors duration-150"
    >
      {/* Start: Hamburger Menu + Dynamic Brand Lockup */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={toggleMobileOpen}
          className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label={t.topbar.toggleNavigationMenu}
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href={ROUTES.home}
          className="flex items-center gap-2.5 group focus:outline-none ps-1 sm:ps-2"
          title={`${companyTitle} Admin Console`}
        >
          <ContentImage
            src={
              resolvedTheme === "dark"
                ? company?.dark_icon_url
                : company?.icon_url
            }
            alt={companyTitle}
            className="w-7 h-7 object-contain shrink-0"
            width={40}
            height={40}
          />
          <ContentImage
            src={
              resolvedTheme === "dark"
                ? company?.dark_logo_url
                : company?.logo_url
            }
            alt={companyTitle}
            className="hidden sm:block h-6 w-auto object-contain"
            fallbackText={companyTitle}
            width={240}
            height={60}
          />
        </Link>
      </div>

      {/* Center: Google Cloud Style Minimalist Search Bar */}
      {/* Search shrinks on phones so the actions on the other side stay on screen. */}
      <div className="flex-1 min-w-0 max-w-xs sm:max-w-md lg:max-w-xl mx-2 sm:mx-6 flex justify-center">
        <GlobalQuickJump className="w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#282a2d] dark:hover:bg-[#35373a] text-slate-500 dark:text-neutral-400 text-xs transition-colors border border-transparent focus-within:border-accent focus-within:bg-white dark:focus-within:bg-[#1f1f1f] focus-within:shadow-sm justify-between cursor-pointer" />
      </div>

      {/* End: Action Cluster */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Calendar Shortcut */}
        {can("calendar", "read") && (
          <Link
            href={ROUTES.calendar}
            className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            title={t.nav.calendar}
            aria-label={t.nav.calendar}
          >
            <Calendar className="w-4 h-4" />
          </Link>
        )}

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          title={t.topbar.toggleTheme}
          aria-label={t.topbar.toggleTheme}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>

        {/* Notifications Popover */}
        <NotificationCenter />
        <span className="mx-1 h-5 w-px bg-ink/10" aria-hidden />
        <AdminProfileDropdown />
      </div>
    </header>
  );
}
