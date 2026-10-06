"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Kanban,
  Users,
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
  Globe,
  FileSignature,
  ShieldAlert,
  TrendingUp,
  HandCoins,
  BadgeDollarSign,
  Contact,
  Gauge,
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
  /** Only for people who manage a team. */
  managersOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { can, loading, managesTeam } = usePermissions();
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const { t } = useAdminLocale();
  const { isFeatureEnabled } = useFeatureToggles();

  const sections = React.useMemo<NavSection[]>(
    () => [
      {
        title: t.nav.overview,
        items: [
          { href: ROUTES.home, label: t.nav.dashboard, icon: LayoutDashboard },
          {
            href: ROUTES.directory,
            label: t.directory.title,
            icon: Contact,
          },
          {
            href: ROUTES.team,
            label: t.team.title,
            icon: Gauge,
            managersOnly: true,
          },
          {
            href: ROUTES.calendar,
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
            href: ROUTES.crm.contacts,
            label: t.nav.contacts,
            icon: Users,
            resource: "contacts",
            moduleKey: "crm_deals",
          },
          {
            href: ROUTES.crm.deals,
            label: t.nav.deals,
            icon: Kanban,
            resource: "deals",
            moduleKey: "crm_deals",
          },
          {
            href: ROUTES.requests.list,
            label: t.requestInbox.title,
            icon: ShieldAlert,
            resource: "requests",
            moduleKey: "crm_deals",
          },
          {
            href: ROUTES.moms.list,
            label: t.sidebar.minutesOfMeetingsMom,
            icon: FileSignature,
            resource: "moms",
            moduleKey: "crm_deals",
          },
        ],
      },
      {
        title: t.nav.finance,
        items: [
          {
            href: ROUTES.quotations.list,
            label: t.sidebar.quotations,
            icon: FileSignature,
            resource: "quotations",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.invoices.list,
            label: t.nav.invoices,
            icon: FileText,
            resource: "invoices",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.payments.list,
            label: t.nav.payments,
            icon: CreditCard,
            resource: "payments",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.expenses.list(),
            label: t.nav.expenses,
            icon: Receipt,
            resource: "expenses",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.services,
            label: t.nav.services,
            icon: Sparkles,
            resource: "invoices",
          },
          {
            href: ROUTES.finance.reports,
            label: t.sidebar.financialReports,
            icon: BarChart,
            resource: "reports",
            moduleKey: "invoicing",
          },
          {
            href: ROUTES.finance.commissions(),
            label: t.commissions.title,
            icon: BadgeDollarSign,
            resource: "reports",
          },
          {
            href: ROUTES.finance.overview,
            label: t.nav.analytics,
            icon: PieChart,
            resource: "finance_analytics",
            moduleKey: "invoicing",
          },
        ],
      },
      {
        title: t.sidebar.humanResources,
        items: [
          {
            href: ROUTES.hr.employees,
            label: t.sidebar.employeeDirectory,
            icon: Users,
            resource: "employees",
            moduleKey: "hrms",
          },
          // Leave and salary documents are self-service: every staff member files their own.
          {
            href: ROUTES.hr.leave(),
            label: t.sidebar.leaveManagement,
            icon: Calendar,
            resource: "self_service",
            moduleKey: "hrms",
          },
          {
            href: ROUTES.hr.documents(),
            label: t.hrExtensions.salaryDocuments,
            icon: FileText,
            resource: "self_service",
            moduleKey: "hrms",
          },
          {
            href: ROUTES.claims.list(),
            label: t.claims.title,
            icon: HandCoins,
            resource: "self_service",
          },
          {
            href: ROUTES.hr.payroll(),
            label: t.sidebar.payrollAndGosi,
            icon: CreditCard,
            resource: "payroll",
            moduleKey: "payroll",
          },
        ],
      },
      {
        title: t.sidebar.governance,
        items: [
          {
            href: ROUTES.approvals(),
            label: t.sidebar.approvalCenter,
            icon: ShieldAlert,
          },
          {
            href: ROUTES.profile(),
            label: t.sidebar.myProfile,
            icon: Users,
          },
        ],
      },
      {
        title: t.nav.cms,
        items: [
          {
            href: ROUTES.cms.website,
            label: t.sidebar.websitePublishing,
            icon: Globe,
            resource: "settings",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.banners,
            label: t.nav.banners,
            icon: Film,
            resource: "banners",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.portfolio,
            label: t.nav.portfolio,
            icon: FolderOpen,
            resource: "portfolio",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.clients,
            label: t.nav.clients,
            icon: Users,
            resource: "clients",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.equipment,
            label: t.nav.equipment,
            icon: Building2,
            resource: "equipment",
            moduleKey: "equipment",
          },
          {
            href: ROUTES.cms.reviews,
            label: t.nav.reviews,
            icon: MessageSquareQuote,
            resource: "reviews",
            moduleKey: "reviews",
          },
          {
            href: ROUTES.cms.faqs,
            label: t.nav.faqs,
            icon: HelpCircle,
            resource: "faqs",
            moduleKey: "cms",
          },
          {
            href: ROUTES.cms.stats,
            label: t.nav.stats,
            icon: BarChart,
            resource: "stats",
            moduleKey: "cms",
          },
          {
            href: ROUTES.analytics,
            label: t.nav.socialAnalytics,
            icon: TrendingUp,
            resource: "social",
          },
        ],
      },
      {
        title: t.nav.system,
        items: [
          {
            href: ROUTES.settings.web,
            label: t.nav.webSettings,
            icon: Globe,
            resource: "settings",
          },
          {
            href: ROUTES.settings.company,
            label: t.nav.companySettings,
            icon: Building2,
            resource: "settings",
          },
          {
            href: ROUTES.settings.modules,
            label: t.nav.modules,
            icon: ToggleLeft,
            resource: "settings",
          },
          {
            href: ROUTES.settings.roles,
            label: t.nav.roles,
            icon: Key,
            resource: "users",
          },
          {
            href: ROUTES.users.list,
            label: t.nav.users,
            icon: ShieldCheck,
            resource: "users",
          },
          {
            href: ROUTES.settings.audit,
            label: t.nav.auditLogs,
            icon: FileText,
            resource: "audit_logs",
          },
        ],
      },
    ],
    [t],
  );

  const visibleSections = React.useMemo(() => {
    if (loading) return sections;

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.moduleKey && !isFeatureEnabled(item.moduleKey)) return false;
          if (item.managersOnly && !managesTeam) return false;
          if (!item.resource) return true;
          return can(item.resource, "read");
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, can, loading, isFeatureEnabled, managesTeam]);

  // Only the most specific matching link is active (/finance/reports must not also light up /finance).
  const activeHref = React.useMemo(() => {
    const matches = visibleSections
      .flatMap((section) => section.items.map((item) => item.href))
      .filter((href) => pathname === href || (href !== ROUTES.home && pathname.startsWith(href + "/")));
    return matches.sort((a, b) => b.length - a.length)[0];
  }, [visibleSections, pathname]);

  const navContent = (
    <nav className="h-full overflow-y-auto py-2.5 space-y-3 select-none">
      {visibleSections.map((section, idx) => (
        <div
          key={section.title}
          className={
            idx > 0
              ? "pt-2 border-t border-slate-100 dark:border-neutral-800"
              : ""
          }
        >
          <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            {section.title}
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 mx-2 px-3 h-9 rounded-full text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#e6f5f2] text-primary dark:bg-[#004d40]/40 dark:text-mint font-semibold"
                      : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-primary dark:text-mint"
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
      <aside className="hidden lg:block shrink-0 h-full w-60 bg-white dark:bg-surface-raised border-e border-ink/15 dark:border-ink/15 z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-50 flex">
          <div
            className="fixed inset-0 top-14 bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-white dark:bg-surface-raised border-e border-ink/15 dark:border-ink/15 shadow-xl flex flex-col z-10 animate-in slide-in-from-start duration-150">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
