"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sliders,Building2,History,Share2,Globe } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function SettingsNavTabs() {
  const pathname = usePathname();
  const { t } = useAdminLocale();

  const tabs = [
    {
      href: "/dashboard/settings/preferences",
      label: t.settingsTabs.preferences,
      icon: Sliders,
    },
    {
      href: "/dashboard/settings/company",
      label: t.settingsTabs.company,
      icon: Building2,
    },
    {
      href: "/dashboard/settings/web",
      label: t.settingsTabs.web,
      icon: Globe,
    },
    {
      href: "/dashboard/settings/audit",
      label: t.settingsTabs.audit,
      icon: History,
    },
    {
      href: "/dashboard/settings/integrations",
      label: t.settingsTabs.integrations,
      icon: Share2,
    },
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
