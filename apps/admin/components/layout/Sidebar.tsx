'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

export function Sidebar() {
  const pathname = usePathname();
  const { t, isRTL } = useAdminLocale();

  const navGroups = [
    {
      label: t.nav.overview,
      items: [
        { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { href: '/dashboard/calendar', label: t.nav.calendar, icon: Calendar, badge: 'Odoo' },
      ],
    },
    {
      label: t.nav.crm,
      items: [
        { href: '/dashboard/crm/deals', label: t.nav.deals, icon: Kanban },
        { href: '/dashboard/crm/contacts', label: t.nav.contacts, icon: Users },
        { href: '/dashboard/crm/leads', label: t.nav.leads, icon: Inbox },
      ],
    },
    {
      label: t.nav.finance,
      items: [
        { href: '/dashboard/invoices', label: t.nav.invoices, icon: FileText },
        { href: '/dashboard/payments', label: t.nav.payments, icon: CreditCard },
        { href: '/dashboard/expenses', label: t.nav.expenses, icon: Receipt },
        { href: '/dashboard/finance', label: t.nav.analytics, icon: PieChart },
      ],
    },
    {
      label: t.nav.cms,
      items: [
        { href: '/dashboard/cms/banners', label: t.nav.banners, icon: Film },
        { href: '/dashboard/cms/portfolio', label: t.nav.portfolio, icon: Camera },
        { href: '/dashboard/cms/clients', label: t.nav.clients, icon: Layers },
        { href: '/dashboard/cms/equipment', label: t.nav.equipment, icon: Wrench },
      ],
    },
    {
      label: t.nav.system,
      items: [
        { href: '/dashboard/users', label: t.nav.users, icon: ShieldCheck },
        { href: '/dashboard/settings/company', label: t.nav.companySettings, icon: Building2 },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#070C0A] border-e border-white/10 flex flex-col justify-between shrink-0 select-none min-h-screen">
      {/* Brand Header: Icon SVG + Wordmark SVG (never typed text) */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 bg-[#0B1210]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            {/* Aperture Icon */}
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 p-1 flex items-center justify-center shrink-0 group-hover:border-[#09937F] transition-colors">
              <img
                src="/icon.svg"
                alt="ishoot"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Logo Wordmark SVG — NOT typed text */}
            <img
              src="/images/logo-color.svg"
              alt="ishoot"
              className="h-5 w-auto object-contain brightness-110"
            />
          </Link>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#09937F]/15 text-[#09937F] border border-[#09937F]/30">
            PRO
          </span>
        </div>

        {/* Navigation Groups */}
        <nav className="p-3.5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[11px] font-bold text-[#9EADA9]/60 uppercase tracking-wider mb-2">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                      isActive
                        ? 'bg-[#014842] text-white shadow-lg shadow-[#014842]/30 border border-[#09937F]/40'
                        : 'text-[#9EADA9] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-[#09937F]'
                            : 'text-[#9EADA9] group-hover:text-white'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {(item as any).badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-[#09937F]/20 text-[#09937F]">
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User Status Bar */}
      <div className="p-3 border-t border-white/10 bg-[#0B1210]">
        <div className="flex items-center justify-between text-xs text-[#9EADA9]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#09937F] animate-pulse" />
            <span className="font-mono text-[11px] text-white">PostgreSQL 15</span>
          </div>
          <span className="text-[10px] font-mono text-[#09937F]">Online</span>
        </div>
      </div>
    </aside>
  );
}
