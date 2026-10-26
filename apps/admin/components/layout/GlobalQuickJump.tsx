"use client";

import * as React from "react";
import { Input, Modal } from "@platform/ui";
import { errorMessage } from "../../lib/error-text";
import { useRouter } from "next/navigation";
import {
Search,Users,
FileText,
Briefcase,
ArrowRight,
Loader2,
UserRound, ShoppingBag, Package, Truck, CheckSquare, ClipboardList, Gavel, Megaphone } from "lucide-react";
import { globalSearchAction } from "../../app/actions/crm";
import type { GlobalSearchResult } from "@platform/database";
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
  const resultsId = React.useId();
  const [error, setError] = React.useState("");

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (!isOpen) { setQuery(""); setResults([]); setSelectedIndex(0); }
  }, [isOpen]);

  React.useEffect(() => {
    let active = true;
    setError(""); setResults([]); setSelectedIndex(0);
    if (!isOpen || query.trim().length < 2) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearchAction(query);
        if (active && res.success) setResults(res.results);
      } catch (failure) {
        if (active) setError(errorMessage(failure, t, t.quickJump.searchFailed));
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [isOpen, query, t]);

  React.useEffect(() => {
    document.getElementById(`${resultsId}-${selectedIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [resultsId, selectedIndex, results]);

  const handleSelect = (result: GlobalSearchResult) => {
    setIsOpen(false);
    router.push(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
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

  /** Role, stage and status codes read as words. */
  const badgeLabel = (category: string, badge: string) => {
    const tables: Record<string, unknown> = { people: t.roles, deals: t.stages, orders: t.orders.statuses, shipments: t.delivery.statuses, tasks: t.tasks.statuses, purchase_orders: t.procurement.statuses, legal: t.legal.statuses, campaigns: t.marketing.campaigns.statuses };
    const table = (tables[category] ?? t.statusLabels) as Record<string, string>;
    return table[badge] ?? badge.replaceAll("_", " ");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "customers":
        return <Users className="w-4 h-4 text-accent" />;
      case "invoices":
        return <FileText className="w-4 h-4 text-amber-500" />;
      case "deals":
        return <Briefcase className="w-4 h-4 text-emerald-500" />;
      case "people":
        return <UserRound className="w-4 h-4 text-sky-500" />;
      case "orders":
        return <ShoppingBag className="w-4 h-4 text-violet-500" />;
      case "products":
        return <Package className="w-4 h-4 text-amber-600" />;
      case "shipments":
        return <Truck className="w-4 h-4 text-sky-600" />;
      case "tasks":
        return <CheckSquare className="w-4 h-4 text-teal-600" />;
      case "purchase_orders":
        return <ClipboardList className="w-4 h-4 text-orange-500" />;
      case "legal":
        return <Gavel className="w-4 h-4 text-slate-500" />;
      case "campaigns":
        return <Megaphone className="w-4 h-4 text-pink-500" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Topbar Trigger Button */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t.quickJump.universalSearch}
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
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t.quickJump.universalSearch}
        className="max-w-xl" footer={<>
            {/* Footer */}
            <div className=" flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
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
            </div>        </>}>
            {/* Input Header */}
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <Input
                role="combobox"
                aria-label={t.quickJump.searchLabel}
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-controls={resultsId}
                aria-activedescendant={results[selectedIndex] ? `${resultsId}-${selectedIndex}` : undefined}
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.quickJump.placeholder}
                className="w-full min-w-0 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {loading && (
                <Loader2 role="status" aria-label={t.quickJump.searching} className="w-4 h-4 text-accent animate-spin shrink-0" />
              )}

            </div>

            {error && <p role="alert" className="py-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
            {/* Results Body */}
            <div id={resultsId} role="listbox" aria-busy={loading} aria-label={t.quickJump.resultsLabel} className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-white/5">
              {query.trim().length < 2 && (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  {t.quickJump.helper}
                </div>
              )}

              {query.trim().length >= 2 && results.length === 0 && !loading && !error && (
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
                    id={`${resultsId}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors ${
                      isSelected
                        ? "bg-tone-95 text-primary dark:bg-tone-15 dark:text-white"
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
                          {badgeLabel(result.category, result.badge)}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                    </div>
                  </div>
                );
              })}
            </div>

      </Modal>
    </>
  );
}
