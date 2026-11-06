"use client";

import { ROUTES } from "../../constants/routes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sliders,
  Building2,
  History,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function SettingsNavTabs() {
  const pathname = usePathname();
  const { t } = useAdminLocale();
  const { can, role } = usePermissions();

  const tabs = [
    {
      href: ROUTES.settings.preferences,
      label: t.settingsTabs.preferences,
      icon: Sliders,
    },
    {
      href: ROUTES.settings.company,
      label: t.settingsTabs.company,
      icon: Building2,
    },
    {
      href: ROUTES.settings.web,
      label: t.settingsTabs.web,
      icon: Globe,
    },
    ...(role === "super_admin" && can("settings", "read")
      ? [
          {
            href: ROUTES.settings.approvals,
            label: t.settingsTabs.approvals,
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const visibleTabs = tabs.filter(
    (tab) =>
      tab.href === ROUTES.settings.preferences || can("settings", "read"),
  );

  return (
    <nav
      aria-label={t.profileDropdown.appearance}
      className="admin-settings-nav"
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-base ease-standard m3-state-layer ${
              isActive
                ? "text-primary before:absolute before:bottom-0 before:inset-x-4 before:h-[3px] before:rounded-t-full before:bg-primary"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon aria-hidden className="w-4 h-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
