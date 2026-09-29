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
  Building2,
  ShieldCheck,
  Sparkles,
  FolderOpen,
  MessageSquareQuote,
  HelpCircle,
  BarChart,
  ToggleLeft,
  Key,
} from "lucide-react";
import { usePermissions, PermissionResource } from "../../hooks/usePermissions";
import { useSidebar } from "./SidebarContext";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useFeatureToggles } from "../../hooks/useFeatureToggles";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource?: PermissionResource;
  moduleKey?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { can, loading } = usePermissions();
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const { t } = useAdminLocale();
  const { isFeatureEnabled } = useFeatureToggles();

  const sections: NavSection[] = [
    {
      title: t.nav.overview,
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
        {
          href: "/dashboard/calendar",
          label: t.nav.calendar,
          icon: Calendar,
          resource: "calendar",
          moduleKey: "calendar",
        },
      ],
    },
    {
      title: t.nav.crm,
      items: [
        {
          href: "/dashboard/crm/contacts",
          label: t.nav.contacts,
          icon: Users,
          resource: "contacts",
          moduleKey: "crm_deals",
        },
        {
          href: "/dashboard/crm/deals",
          label: t.nav.deals,
          icon: Kanban,
          resource: "deals",
          moduleKey: "crm_deals",
        },
        {
          href: "/dashboard/crm/leads",
          label: t.nav.leads,
          icon: Inbox,
          resource: "leads",
          moduleKey: "crm_deals",
        },
      ],
    },
    {
      title: t.nav.finance,
      items: [
        {
          href: "/dashboard/invoices",
          label: t.nav.invoices,
          icon: FileText,
          resource: "invoices",
          moduleKey: "invoicing",
        },
        {
          href: "/dashboard/payments",
          label: t.nav.payments,
          icon: CreditCard,
          resource: "payments",
          moduleKey: "invoicing",
        },
        {
          href: "/dashboard/expenses",
          label: t.nav.expenses,
          icon: Receipt,
          resource: "expenses",
          moduleKey: "invoicing",
        },
        {
          href: "/dashboard/services",
          label: t.nav.services,
          icon: Sparkles,
          resource: "invoices",
        },
        {
          href: "/dashboard/finance",
          label: t.nav.analytics,
          icon: PieChart,
          resource: "finance_analytics",
          moduleKey: "invoicing",
        },
      ],
    },
    {
      title: t.nav.cms,
      items: [
        {
          href: "/dashboard/cms/banners",
          label: t.nav.banners,
          icon: Film,
          resource: "banners",
          moduleKey: "cms",
        },
        {
          href: "/dashboard/cms/portfolio",
          label: t.nav.portfolio,
          icon: FolderOpen,
          resource: "portfolio",
          moduleKey: "cms",
        },
        {
          href: "/dashboard/cms/clients",
          label: t.nav.clients,
          icon: Users,
          resource: "clients",
          moduleKey: "cms",
        },
        {
          href: "/dashboard/cms/equipment",
          label: t.nav.equipment,
          icon: Building2,
          resource: "equipment",
          moduleKey: "equipment",
        },
        {
          href: "/dashboard/cms/reviews",
          label: t.nav.reviews,
          icon: MessageSquareQuote,
          resource: "reviews",
          moduleKey: "reviews",
        },
        {
          href: "/dashboard/cms/faqs",
          label: t.nav.faqs,
          icon: HelpCircle,
          resource: "faqs",
          moduleKey: "cms",
        },
        {
          href: "/dashboard/cms/stats",
          label: t.nav.stats,
          icon: BarChart,
          resource: "stats",
          moduleKey: "cms",
        },
      ],
    },
    {
      title: t.nav.system,
      items: [
        {
          href: "/dashboard/settings/company",
          label: t.nav.companySettings,
          icon: Building2,
          resource: "settings",
        },
        {
          href: "/dashboard/settings/modules",
          label: t.nav.modules,
          icon: ToggleLeft,
          resource: "settings",
        },
        {
          href: "/dashboard/settings/roles",
          label: t.nav.roles,
          icon: Key,
          resource: "users",
        },
        {
          href: "/dashboard/users",
          label: t.nav.users,
          icon: ShieldCheck,
          resource: "users",
        },
        {
          href: "/dashboard/settings/audit",
          label: t.nav.auditLogs,
          icon: FileText,
          resource: "audit_logs",
        },
      ],
    },
  ];

  const visibleSections = React.useMemo(() => {
    if (loading) return sections;

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.moduleKey && !isFeatureEnabled(item.moduleKey)) return false;
          if (!item.resource) return true;
          return can(item.resource, "read");
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, can, loading, isFeatureEnabled]);

  const navContent = (
    <nav className="h-full overflow-y-auto py-2.5 space-y-3 select-none">
      {visibleSections.map((section, idx) => (
        <div key={section.title} className={idx > 0 ? "pt-2 border-t border-slate-100 dark:border-neutral-800" : ""}>
          <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            {section.title}
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 mx-2 px-3 h-9 rounded-full text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#e6f5f2] text-[#014842] dark:bg-[#004d40]/40 dark:text-[#7de0d1] font-semibold"
                      : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-[#014842] dark:text-[#7de0d1]"
                        : "text-slate-500 dark:text-neutral-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Fixed Google Navigation Drawer (w-60, 240px) */}
      <aside className="hidden lg:block shrink-0 h-full w-60 bg-white dark:bg-[#1a1a1a] border-e border-[#dadce0] dark:border-[#3c4043] z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-50 flex">
          <div
            className="fixed inset-0 top-14 bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-white dark:bg-[#1a1a1a] border-e border-[#dadce0] dark:border-[#3c4043] shadow-xl flex flex-col z-10 animate-in slide-in-from-start duration-150">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
