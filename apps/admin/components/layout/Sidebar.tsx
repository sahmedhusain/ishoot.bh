"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Kanban,
  Users,
  Inbox,
  FileText,
  CreditCard,
  Receipt,
  PieChart,
  Film,
  Camera,
  Layers,
  Wrench,
  ShieldCheck,
  Building2,
  Sliders,
  History,
  Share2,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions, PermissionResource } from "../../hooks/usePermissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  resource?: PermissionResource;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useAdminLocale();
  const { can, loading } = usePermissions();

  const allNavGroups: NavGroup[] = [
    {
      label: t.nav.overview,
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
        {
          href: "/dashboard/calendar",
          label: t.nav.calendar,
          icon: Calendar,
          badge: "Odoo",
          resource: "calendar",
        },
      ],
    },
    {
      label: t.nav.crm,
      items: [
        {
          href: "/dashboard/crm/deals",
          label: t.nav.deals,
          icon: Kanban,
          resource: "deals",
        },
        {
          href: "/dashboard/crm/contacts",
          label: t.nav.contacts,
          icon: Users,
          resource: "contacts",
        },
        {
          href: "/dashboard/crm/leads",
          label: t.nav.leads,
          icon: Inbox,
          resource: "leads",
        },
      ],
    },
    {
      label: t.nav.finance,
      items: [
        {
          href: "/dashboard/invoices",
          label: t.nav.invoices,
          icon: FileText,
          resource: "invoices",
        },
        {
          href: "/dashboard/payments",
          label: t.nav.payments,
          icon: CreditCard,
          resource: "payments",
        },
        {
          href: "/dashboard/expenses",
          label: t.nav.expenses,
          icon: Receipt,
          resource: "expenses",
        },
        {
          href: "/dashboard/finance",
          label: t.nav.analytics,
          icon: PieChart,
          resource: "finance_analytics",
        },
      ],
    },
    {
      label: t.nav.cms,
      items: [
        {
          href: "/dashboard/cms/banners",
          label: t.nav.banners,
          icon: Film,
          resource: "banners",
        },
        {
          href: "/dashboard/cms/portfolio",
          label: t.nav.portfolio,
          icon: Camera,
          resource: "portfolio",
        },
        {
          href: "/dashboard/cms/clients",
          label: t.nav.clients,
          icon: Layers,
          resource: "clients",
        },
        {
          href: "/dashboard/cms/equipment",
          label: t.nav.equipment,
          icon: Wrench,
          resource: "equipment",
        },
      ],
    },
    {
      label: t.nav.system,
      items: [
        {
          href: "/dashboard/users",
          label: t.nav.users,
          icon: ShieldCheck,
          resource: "users",
        },
        {
          href: "/dashboard/company/documents",
          label: "Legal Vault",
          icon: Building2,
          resource: "settings",
        },
        {
          href: "/dashboard/settings/preferences",
          label: t.nav.appearance,
          icon: Sliders,
        },
        {
          href: "/dashboard/settings/company",
          label: t.nav.companySettings,
          icon: Building2,
          resource: "settings",
        },
        {
          href: "/dashboard/settings/audit",
          label: t.nav.auditLogs,
          icon: History,
          resource: "audit_logs",
        },
        {
          href: "/dashboard/settings/integrations",
          label: t.nav.integrations,
          icon: Share2,
          resource: "settings",
        },
      ],
    },
  ];

  const visibleNavGroups = React.useMemo(() => {
    if (loading) return allNavGroups; 

    return allNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.resource) return true;
          return can(item.resource, "read");
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [allNavGroups, can, loading]);

  return (
    <aside className="w-64 bg-white dark:bg-[#070C0A] border-e border-slate-200 dark:border-white/10 flex flex-col justify-between shrink-0 select-none min-h-screen transition-colors duration-200">
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B1210]">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <img
              src="/icon.svg"
              alt="ishoot"
              className="w-7 h-7 object-contain shrink-0"
            />
            <span className="font-display font-extrabold text-xl tracking-tight text-[#014842] dark:text-white">
              ishoot<span className="text-[#09937F]">.</span>
            </span>
          </Link>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#09937F]/15 text-[#09937F] border border-[#09937F]/30">
            M3
          </span>
        </div>

        <nav className="p-3.5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {visibleNavGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                      isActive
                        ? "bg-[#E6F5F2] text-[#014842] dark:bg-[#014842] dark:text-white shadow-sm border border-[#09937F]/30 dark:border-[#09937F]/40"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? "text-[#09937F]"
                            : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-white"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-[#09937F]/20 text-[#09937F]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B1210]">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9EADA9]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#09937F] animate-pulse" />
            <span className="font-mono text-[11px] text-slate-700 dark:text-white">
              Enterprise M3
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#09937F] font-semibold">
            {t.profileDropdown.connected}
          </span>
        </div>
      </div>
    </aside>
  );
}
