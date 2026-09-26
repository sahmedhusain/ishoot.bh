'use client';

import * as React from 'react';
import { BreadcrumbTrail } from './BreadcrumbTrail';
import { Search, Bell, ExternalLink } from 'lucide-react';

export function Topbar() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Breadcrumbs */}
      <BreadcrumbTrail />

      {/* Quick Search & Actions */}
      <div className="flex items-center gap-4">
        {/* Quick Search */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>بحث سريع / Quick search...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono shadow-xs">⌘K</kbd>
        </div>

        {/* View Live Public Site */}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#014842] hover:text-[#09937F] transition-colors"
          title="Open Public Site"
        >
          <span>الموقع الرئيسي / Live Site</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Notifications */}
        <button
          className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#014842] transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#09937F] absolute top-2 right-2 ring-2 ring-white" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#014842] flex items-center justify-center text-xs font-bold text-white font-mono">
            SA
          </div>
          <div className="hidden md:block text-start leading-tight">
            <div className="text-xs font-semibold text-slate-900">سيد أحمد / Super Admin</div>
            <div className="text-[10px] text-[#09937F] font-semibold">admin@ishoot.bh</div>
          </div>
        </div>
      </div>
    </header>
  );
}
