"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
Search,Users,
FileText,
Briefcase,
ArrowRight,
Loader2,
X
} from "lucide-react";
import { globalSearchAction } from "../../app/actions/crm";
import type { GlobalSearchResult } from "@ishoot/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function GlobalQuickJump({ className }: { className?: string } = {}) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<GlobalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query
  React.useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearchAction(query);
        if (res.success && res.results) {
          setResults(res.results);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: GlobalSearchResult) => {
    setIsOpen(false);
    router.push(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "customers":
        return <Users className="w-4 h-4 text-accent" />;
      case "invoices":
        return <FileText className="w-4 h-4 text-amber-500" />;
      case "deals":
        return <Briefcase className="w-4 h-4 text-emerald-500" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Topbar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 text-xs transition-colors border border-slate-200/80 dark:border-white/10 w-44 sm:w-64 justify-between"
        }
      >
        <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 truncate">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.quickJump.navigate}...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-[10px]  text-slate-400">
          {t.copy.shortcut}</kbd>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 modal-scrim animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-xl bg-white dark:bg-surface-raised rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Input Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.quickJump.placeholder}
                className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {loading && (
                <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Body */}
            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-white/5">
              {!query.trim() && (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  {t.quickJump.helper}
                </div>
              )}

              {query.trim().length >= 2 && results.length === 0 && !loading && (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  {t.quickJump.noMatches}{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    &quot;{query}&quot;
                  </span>
                </div>
              )}

              {results.map((result, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${result.category}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors ${
                      isSelected
                        ? "bg-[#E6F5F2] text-primary dark:bg-[#192F2B] dark:text-white"
                        : "hover:bg-slate-50 text-slate-700 dark:hover:bg-white/5 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 shrink-0">
                        {getCategoryIcon(result.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate text-sm">
                          {result.title}
                        </div>
                        <div className="text-[11px] opacity-75 truncate mt-0.5">
                          {result.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {result.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px]  uppercase bg-slate-200/60 dark:bg-white/10">
                          {result.badge}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#0B1312] border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-3">
                <span>
                  <kbd className="px-1 py-0.5 bg-white dark:bg-black/30 rounded border border-slate-200 dark:border-white/10">
                    ↑↓
                  </kbd>{" "}
                  {t.quickJump.navigate}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-white dark:bg-black/30 rounded border border-slate-200 dark:border-white/10">
                    ↵
                  </kbd>{" "}
                  {t.quickJump.select}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-white dark:bg-black/30 rounded border border-slate-200 dark:border-white/10">
                    {t.copy.escape}</kbd>{" "}
                  {t.actions.cancel}
                </span>
              </span>
              <span className=" text-[10px] text-accent font-semibold">
                {t.quickJump.universalSearch}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
