'use client';

import * as React from 'react';
import { BreadcrumbTrail } from './BreadcrumbTrail';
import { Search, Bell, ExternalLink } from 'lucide-react';

export function Topbar() {
  return (
    <header className="h-16 border-b border-white/10 bg-[#050807]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Breadcrumbs */}
      <BreadcrumbTrail />

      {/* Quick Search & Actions */}
      <div className="flex items-center gap-4">
        {/* Quick Search (Cmd+K) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#9EADA9]">
          <Search className="w-3.5 h-3.5 text-[#9EADA9]" />
          <span>Quick search...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">⌘K</kbd>
        </div>

        {/* View Live Public Site */}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#09937F] hover:text-[#0BB49B] transition-colors"
          title="Open Public Site"
        >
          <span>Live Site</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* Notifications */}
        <button
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-white transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#09937F] absolute top-2 right-2 ring-2 ring-[#050807]" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-[#014842] border border-[#09937F]/50 flex items-center justify-center text-xs font-bold text-white font-mono">
            SH
          </div>
          <div className="hidden md:block text-start leading-tight">
            <div className="text-xs font-semibold text-white">Sayed Ahmed</div>
            <div className="text-[10px] text-[#09937F] font-mono">Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
