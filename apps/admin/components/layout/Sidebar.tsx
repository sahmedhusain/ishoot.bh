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
  LogOut,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navGroups = [
    {
      label: 'نظرة عامة / OVERVIEW',
      items: [
        { href: '/dashboard', label: 'لوحة التحكم / Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'إدارة المحتوى / CMS',
      items: [
        { href: '/dashboard/cms/banners', label: 'بنرات الهيرو / Banners', icon: Film },
        { href: '/dashboard/cms/portfolio', label: 'معرض الأعمال / Portfolio', icon: Camera },
        { href: '/dashboard/cms/clients', label: 'شعارات العملاء / Clients', icon: Layers },
        { href: '/dashboard/cms/equipment', label: 'المعدات والإنتاج / Gear', icon: Camera },
      ],
    },
    {
      label: 'إدارة العملاء / CRM',
      items: [
        { href: '/dashboard/crm/leads', label: 'الطلبات والاستفسارات / Leads', icon: Inbox },
        { href: '/dashboard/crm/deals', label: 'الصفقات / Deals Kanban', icon: Kanban },
        { href: '/dashboard/crm/contacts', label: 'دليل العملاء / Contacts', icon: Users },
      ],
    },
    {
      label: 'المالية والإنتاج / FINANCE',
      items: [
        { href: '/dashboard/invoices', label: 'الفواتير / Invoices', icon: FileText },
        { href: '/dashboard/payments', label: 'المقبوضات والسندات / Payments', icon: CreditCard },
        { href: '/dashboard/expenses', label: 'المصروفات / Expenses', icon: Receipt },
        { href: '/dashboard/finance', label: 'التقارير الأرباح / Analytics', icon: PieChart },
      ],
    },
    {
      label: 'النظام والإعدادات / SYSTEM',
      items: [
        { href: '/dashboard/settings/company', label: 'إعدادات الشركة / Settings', icon: Building2 },
        { href: '/dashboard/users', label: 'إدارة المستخدمين / Users', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none min-h-screen shadow-sm">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <img
              src="/icon.svg"
              alt="ishoot Icon"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[#014842] font-display">
              آي شوت<span className="text-[#09937F]">.</span>
            </span>
            <span className="text-[10px] text-slate-500 block font-semibold">
              لوحة الإدارة — Admin
            </span>
          </div>
        </div>

        {/* Navigation Menus */}
        <nav className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-130px)]">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#014842] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#014842] hover:bg-slate-100/80 border border-transparent'
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
      <div className="p-4 border-t border-slate-100">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج / Exit</span>
        </Link>
      </div>
    </aside>
  );
}
