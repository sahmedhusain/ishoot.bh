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
} from "lucide-react";
import { usePermissions, PermissionResource } from "../../hooks/usePermissions";
import { useSidebar } from "./SidebarContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource?: PermissionResource;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { can, loading } = usePermissions();
  const { isMobileOpen, setIsMobileOpen } = useSidebar();

  const sections: NavSection[] = [
    {
      title: "Core",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        {
          href: "/dashboard/calendar",
          label: "Calendar & Shoots",
          icon: Calendar,
          resource: "calendar",
        },
      ],
    },
    {
      title: "CRM",
      items: [
        {
          href: "/dashboard/crm/contacts",
          label: "Clients",
          icon: Users,
          resource: "contacts",
        },
        {
          href: "/dashboard/crm/deals",
          label: "Deals Pipeline",
          icon: Kanban,
          resource: "deals",
        },
        {
          href: "/dashboard/crm/leads",
          label: "Inquiries",
          icon: Inbox,
          resource: "leads",
        },
      ],
    },
    {
      title: "Billing & Finance",
      items: [
        {
          href: "/dashboard/invoices",
          label: "Invoices",
          icon: FileText,
          resource: "invoices",
        },
        {
          href: "/dashboard/payments",
          label: "Payment Receipts",
          icon: CreditCard,
          resource: "payments",
        },
        {
          href: "/dashboard/expenses",
          label: "Operating Expenses",
          icon: Receipt,
          resource: "expenses",
        },
        {
          href: "/dashboard/services",
          label: "Services & Rates",
          icon: Sparkles,
          resource: "invoices",
        },
        {
          href: "/dashboard/finance",
          label: "Analytics & P&L",
          icon: PieChart,
          resource: "finance_analytics",
        },
      ],
    },
    {
      title: "Vault",
      items: [
        {
          href: "/dashboard/archive",
          label: "Archive & Files",
          icon: FolderOpen,
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          href: "/dashboard/cms/banners",
          label: "CMS & Assets",
          icon: Film,
          resource: "banners",
        },
        {
          href: "/dashboard/settings/company",
          label: "Company Settings",
          icon: Building2,
          resource: "settings",
        },
        {
          href: "/dashboard/users",
          label: "Users & Access",
          icon: ShieldCheck,
          resource: "users",
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
          if (!item.resource) return true;
          return can(item.resource, "read");
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, can, loading]);

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
