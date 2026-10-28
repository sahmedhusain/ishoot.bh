"use client";
import { ROUTES } from "../../constants/routes";
import { ContentImage } from "../shared/ContentImage";

import Link from "next/link";
import { Calendar, Sun, Moon, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme } from "../../hooks/useAdminTheme";
import { usePermissions } from "../../hooks/usePermissions";
import { NotificationCenter } from "./NotificationCenter";
import { AdminProfileDropdown } from "./AdminProfileDropdown";
import { GlobalQuickJump } from "./GlobalQuickJump";
import { useSidebar } from "./SidebarContext";
import type { CRMContact, CompanySettings } from "@platform/database/types";

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
  const { isArabic, t } = useAdminLocale();
  const { can } = usePermissions();
  const { resolvedTheme, setTheme } = useAdminTheme();
  const { toggleMobileOpen, isCollapsed, toggleCollapsed } = useSidebar();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const companyTitle =
    (isArabic ? company?.company_name_ar : company?.company_name_en) || "";

  return (
    <header
      data-topbar
      className="admin-topbar"
    >
      {/* Start: Hamburger Menu + Dynamic Brand Lockup */}
      <div className="admin-brand">
        <button
          type="button"
          onClick={toggleMobileOpen}
          className="admin-icon-action admin-mobile-navigation-toggle"
          aria-label={t.topbar.toggleNavigationMenu}
        >
          <Menu className="w-5 h-5" />
        </button>

        <button type="button" className="admin-icon-action admin-desktop-navigation-toggle" onClick={toggleCollapsed} aria-label={isCollapsed ? t.appearance.expandNavigation : t.appearance.collapseNavigation} aria-expanded={!isCollapsed}>
          {isCollapsed ? <PanelLeftOpen aria-hidden className="w-5 h-5 rtl:-scale-x-100" /> : <PanelLeftClose aria-hidden className="w-5 h-5 rtl:-scale-x-100" />}
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

      {/* Center: M3 Search Bar */}
      {/* Search shrinks on phones so the actions on the other side stay on screen. */}
      <div className="admin-topbar-search">
        <GlobalQuickJump className="w-full flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-container-highest hover:bg-surface-container-high dark:bg-surface-container-highest dark:hover:bg-surface-container-high text-on-surface-variant text-xs transition-colors border border-transparent focus-within:border-primary focus-within:bg-surface-container-lowest dark:focus-within:bg-surface-container-lowest focus-within:shadow-m3-1 justify-between cursor-pointer" />
      </div>

      {/* End: Action Cluster */}
      <div className="admin-topbar-actions">
        {/* Calendar Shortcut */}
        {can("calendar", "read") && (
          <Link
            href={ROUTES.calendar}
            className="admin-icon-action hidden sm:inline-flex"
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
          className="admin-icon-action"
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
        <span className="mx-1 h-5 w-px bg-outline-variant/40" aria-hidden />
        <AdminProfileDropdown />
      </div>
    </header>
  );
}
