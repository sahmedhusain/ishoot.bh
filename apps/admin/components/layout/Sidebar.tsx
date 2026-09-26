'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Film,
  Camera,
  Layers,
  Inbox,
  Kanban,
  Users,
  FileText,
  CreditCard,
  Receipt,
  PieChart,
  Building2,
  Settings,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navGroups = [
    {
      label: 'OVERVIEW',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'CMS CONTENT',
      items: [
        { href: '/dashboard/cms/banners', label: 'Hero Banners', icon: Film },
        { href: '/dashboard/cms/portfolio', label: 'Portfolio Works', icon: Camera },
        { href: '/dashboard/cms/clients', label: 'Client Logos', icon: Layers },
        { href: '/dashboard/cms/equipment', label: 'Gear Locker', icon: Camera },
      ],
    },
    {
      label: 'CRM PIPELINE',
      items: [
        { href: '/dashboard/crm/leads', label: 'Inquiries & Leads', icon: Inbox },
        { href: '/dashboard/crm/deals', label: 'Deals Kanban', icon: Kanban },
        { href: '/dashboard/crm/contacts', label: 'Client Directory', icon: Users },
      ],
    },
    {
      label: 'FINANCIAL STUDIO',
      items: [
        { href: '/dashboard/invoices', label: 'Invoices', icon: FileText },
        { href: '/dashboard/payments', label: 'Payments & Receipts', icon: CreditCard },
        { href: '/dashboard/expenses', label: 'Operating Expenses', icon: Receipt },
        { href: '/dashboard/finance', label: 'P&L & Analytics', icon: PieChart },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        { href: '/dashboard/settings/company', label: 'Company Settings', icon: Building2 },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0B1210] border-r border-white/10 flex flex-col justify-between shrink-0 select-none min-h-screen">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#014842] border border-[#09937F]/50">
            <span className="w-3 h-3 rounded-full bg-[#09937F]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white font-display">
              ishoot<span className="text-[#09937F]">.</span>
            </span>
            <span className="text-[10px] text-[#9EADA9] block uppercase tracking-widest font-mono">
              Admin Suite
            </span>
          </div>
        </div>

        {/* Navigation Menus */}
        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-130px)]">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-mono tracking-widest text-[#9EADA9]/60 font-semibold mb-2">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#09937F]/15 text-[#09937F] border border-[#09937F]/30 font-semibold shadow-sm'
                        : 'text-[#9EADA9] hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-white/10">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Workspace</span>
        </Link>
      </div>
    </aside>
  );
}
