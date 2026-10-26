"use client";

import { ROUTES } from "../../constants/routes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sliders,
  Building2,
  History,
  Share2,
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
    {
      href: ROUTES.settings.audit,
      label: t.settingsTabs.audit,
      icon: History,
    },
    {
      href: ROUTES.settings.integrations,
      label: t.settingsTabs.integrations,
      icon: Share2,
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
      tab.href === ROUTES.settings.preferences ||
      (tab.href === ROUTES.settings.audit
        ? can("audit_logs", "read")
        : tab.href === ROUTES.settings.integrations
          ? can("settings", "edit") || can("calendar", "read")
          : can("settings", "read")),
  );

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-ink/10 w-fit overflow-x-auto max-w-full">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${isActive
              ? "bg-primary text-white shadow-md border border-accent/40"
              : "text-ink-muted hover:text-ink hover:bg-ink/5"
              }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${isActive ? "text-accent" : "text-ink-muted"}`}
            />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
