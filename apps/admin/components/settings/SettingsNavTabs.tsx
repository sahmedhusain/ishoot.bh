"use client";

import { ROUTES } from "../../constants/routes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sliders, Building2, History, Share2, Globe, ShieldCheck } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function SettingsNavTabs() {
  const pathname = usePathname();
  const { t } = useAdminLocale();
  const { role } = usePermissions();

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
    ...(role === "super_admin"
      ? [{ href: ROUTES.settings.approvals, label: t.settingsTabs.approvals, icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0B1210] border border-white/10 w-fit overflow-x-auto max-w-full">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? "bg-[#014842] text-white shadow-md border border-[#09937F]/40"
                : "text-[#9EADA9] hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${isActive ? "text-[#09937F]" : "text-[#9EADA9]"}`}
            />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
