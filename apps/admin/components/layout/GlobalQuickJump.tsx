"use client";

import * as React from "react";
import { Input, FloatingSurface } from "@platform/ui";
import { errorMessage } from "../../lib/error-text";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  FileText,
  Briefcase,
  ArrowRight,
  Loader2,
  UserRound,
  ShoppingBag,
  Package,
  Truck,
  CheckSquare,
  ClipboardList,
  Gavel,
  Megaphone,
  X,
  Calendar,
  FolderArchive,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { globalSearchAction } from "../../app/actions/crm";
import type { GlobalSearchResult } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function GlobalQuickJump({ className }: { className?: string } = {}) {
  const router = useRouter();
  const { t } = useAdminLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<GlobalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsId = React.useId();
  const panelRef = React.useRef<HTMLElement | null>(null);
  const shortcutOpener = React.useRef<HTMLElement | null>(null);
  const [error, setError] = React.useState("");

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const opener = document.activeElement as HTMLElement | null;
        const scope = opener
          ?.closest("[data-dialog-scope]")
          ?.getAttribute("data-dialog-scope");
        if (scope) {
          containerRef.current?.setAttribute("data-dialog-scope-owner", scope);
          shortcutOpener.current = opener;
        }
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      containerRef.current?.removeAttribute("data-dialog-scope-owner");
      shortcutOpener.current = null;
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setCategoryFilter("all");
    }
  }, [isOpen]);

  React.useEffect(() => {
    let active = true;
    setError("");
    setResults([]);
    setSelectedIndex(0);
    if (!isOpen || query.trim().length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearchAction(query);
        if (active && res.success) setResults(res.results);
      } catch (failure) {
        if (active)
          setError(errorMessage(failure, t, t.quickJump.searchFailed));
      } finally {
        if (active) setLoading(false);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, query, t]);

  const filteredResults = React.useMemo(() => {
    if (categoryFilter === "all") return results;
    return results.filter((r) => r.category === categoryFilter);
  }, [results, categoryFilter]);

  const availableCategories = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results) {
      counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [results]);

  const quickShortcuts = React.useMemo(
    () => [
      {
        id: "dashboard",
        title: t.nav.dashboard,
        subtitle: t.nav.overview,
        url: ROUTES.home,
        icon: <LayoutDashboard className="w-4 h-4 text-primary" />,
      },
      {
        id: "deals",
        title: t.nav.deals,
        subtitle: t.nav.crm,
        url: ROUTES.crm.deals,
        icon: <Briefcase className="w-4 h-4 text-emerald-500" />,
      },
      {
        id: "invoices",
        title: t.nav.invoices,
        subtitle: t.nav.finance,
        url: ROUTES.invoices.list,
        icon: <FileText className="w-4 h-4 text-amber-500" />,
      },
      {
        id: "orders",
        title: t.quickJump.categories.orders,
        subtitle: t.navigationGroups.sales,
        url: ROUTES.orders.list,
        icon: <ShoppingBag className="w-4 h-4 text-violet-500" />,
      },
      {
        id: "calendar",
        title: t.nav.calendar,
        subtitle: t.navigationGroups.workspace,
        url: ROUTES.calendar,
        icon: <Calendar className="w-4 h-4 text-sky-500" />,
      },
      {
        id: "archive",
        title: t.dashboardBoard.widgets.archive_folders,
        subtitle: t.navigationGroups.communications,
        url: ROUTES.archive,
        icon: <FolderArchive className="w-4 h-4 text-teal-500" />,
      },
    ],
    [t],
  );

  React.useEffect(() => {
    document
      .getElementById(`${resultsId}-${selectedIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [resultsId, selectedIndex, filteredResults]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
      shortcutOpener.current?.focus();
      return;
    }
    if (e.nativeEvent.isComposing) return;
    const activeListLength =
      query.trim().length >= 2 ? filteredResults.length : quickShortcuts.length;
    if (!activeListLength) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < activeListLength - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : activeListLength - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim().length >= 2 && filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex].url);
      } else if (query.trim().length < 2 && quickShortcuts[selectedIndex]) {
        handleSelect(quickShortcuts[selectedIndex].url);
      }
    }
  };

  /** Role, stage and status codes read as words. */
  const badgeLabel = (category: string, badge: string) => {
    const tables: Record<string, unknown> = {
      people: t.roles,
      deals: t.stages,
      orders: t.orders.statuses,
      shipments: t.delivery.statuses,
      tasks: t.tasks.statuses,
      purchase_orders: t.procurement.statuses,
      legal: t.legal.statuses,
      campaigns: t.marketing.campaigns.statuses,
    };
    const table = (tables[category] ?? t.statusLabels) as Record<
      string,
      string
    >;
    return table[badge] ?? badge.replaceAll("_", " ");
  };

  const categoryTitle = (category: string) => {
    const map = t.quickJump.categories as Record<string, string>;
    return map[category] ?? category;
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
        return <Gavel className="w-4 h-4 text-ink-muted" />;
      case "campaigns":
        return <Megaphone className="w-4 h-4 text-pink-500" />;
      default:
        return <Search className="w-4 h-4 text-ink-muted" />;
    }
  };

  return (
    <div ref={containerRef} className="w-full min-w-0 relative group">
      {/* M3 SearchBar Container */}
      <div className="relative flex items-center w-full">
        <span
          className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center text-on-surface-variant group-focus-within:text-primary transition-all duration-200 group-focus-within:scale-110"
          aria-hidden="true"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </span>

        <Input
          ref={inputRef}
          role="combobox"
          type="search"
          autoComplete="off"
          aria-label={t.quickJump.searchLabel}
          aria-keyshortcuts="Meta+K Control+K"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? resultsId : undefined}
          aria-activedescendant={
            isOpen ? `${resultsId}-${selectedIndex}` : undefined
          }
          value={query}
          placeholder={t.quickJump.universalSearch}
          className={`${className ?? ""} !ps-10 !pe-20 transition-all duration-300 ease-&lsqb;cubic-bezier(0.2,0,0,1)&rsqb;`}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={(event) => {
            if (
              !panelRef.current?.contains(event.relatedTarget as Node) &&
              !containerRef.current?.contains(event.relatedTarget as Node)
            ) {
              setIsOpen(false);
            }
          }}
        />

        <div className=" absolute end-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5">
          {query.length > 0 ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery("");
                setResults([]);
                setCategoryFilter("all");
                inputRef.current?.focus();
              }}
              aria-label={t.quickJump.clearSearch}
              title={t.quickJump.clearSearch}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-ink-muted hover:text-ink hover:bg-ink/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : null}
          <kbd
            dir="ltr"
            className="hidden sm:inline-flex items-center rounded-full border border-outline-variant/70 bg-surface-container-lowest/85 px-2 py-0.5 text-[10px] font-semibold text-ink-muted shadow-2xs pointer-events-none"
          >
            {t.quickJump.shortcutHint}
          </kbd>
        </div>
      </div>

      {/* M3 SearchView Suggestion Popover */}
      {isOpen && (
        <FloatingSurface
          ref={panelRef}
          anchor={containerRef.current ?? inputRef.current}
          onClose={() => setIsOpen(false)}
          onMouseDown={(event) => event.preventDefault()}
          className="p-0 overflow-hidden shadow-2xl border border-outline-variant/80"
        >
          {/* Category Filter Chips when results exist */}
          {availableCategories.length > 1 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 py-2.5 bg-surface-container-low border-b border-outline-variant/60">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === "all"
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "bg-surface-container-highest text-ink-muted hover:text-ink"
                }`}
              >
                {t.quickJump.allCategories} ({results.length})
              </button>
              {availableCategories.map(([cat, count]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat);
                    setSelectedIndex(0);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-surface-container-highest text-ink-muted hover:text-ink"
                  }`}
                >
                  {categoryTitle(cat)} ({count})
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-500/10"
            >
              {error}
            </p>
          ) : null}

          {/* Results or Suggested Shortcuts Body */}
          <div
            id={resultsId}
            role="listbox"
            aria-busy={loading}
            aria-label={t.quickJump.resultsLabel}
            className="max-h-96 overflow-y-auto p-2.5 space-y-1"
          >
            {query.trim().length < 2 && (
              <div className="space-y-2">
                <div className="px-2.5 pt-1.5 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    <Sparkles
                      className="w-3.5 h-3.5 text-primary"
                      aria-hidden="true"
                    />
                    {t.quickJump.quickLinksTitle}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {quickShortcuts.map((shortcut, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={shortcut.id}
                        id={`${resultsId}-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(shortcut.url)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`p-2.5 rounded-2xl cursor-pointer flex items-center justify-between gap-3 text-xs transition-all duration-150 ${
                          isSelected
                            ? "bg-secondary-container text-on-secondary-container shadow-2xs scale-[0.995]"
                            : "hover:bg-surface-container-high text-ink"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                            {shortcut.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate text-xs">
                              {shortcut.title}
                            </div>
                            <div className="text-[10px] opacity-70 truncate">
                              {shortcut.subtitle}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 opacity-50 shrink-0 rtl:-scale-x-100" />
                      </div>
                    );
                  })}
                </div>
                <p className="px-2.5 pt-2 pb-1 text-[11px] text-ink-muted leading-relaxed border-t border-outline-variant/50">
                  {t.quickJump.helper}
                </p>
              </div>
            )}

            {query.trim().length >= 2 &&
              filteredResults.length === 0 &&
              !loading &&
              !error && (
                <div className="py-10 px-4 text-center space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high mx-auto flex items-center justify-center text-ink-muted">
                    <Search className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="text-xs text-ink-muted">
                    {t.quickJump.noMatches}{" "}
                    <span className="font-semibold text-ink">
                      &quot;{query}&quot;
                    </span>
                  </div>
                </div>
              )}

            {filteredResults.map((result, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${result.category}-${result.id}`}
                  id={`${resultsId}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(result.url)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-2xl cursor-pointer flex items-center justify-between gap-3 text-xs transition-all duration-150 ${
                    isSelected
                      ? "bg-secondary-container text-on-secondary-container shadow-2xs"
                      : "hover:bg-surface-container-high text-ink"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                      {getCategoryIcon(result.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate text-sm">
                          <bdi dir="auto">{result.title}</bdi>
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-ink-muted shrink-0">
                          {categoryTitle(result.category)}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-75 truncate mt-0.5">
                        <bdi dir="auto">{result.subtitle}</bdi>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {result.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-surface-container-highest text-ink">
                        {badgeLabel(result.category, result.badge)}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 rtl:-scale-x-100" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* M3 SearchView Footer */}
          <div className="px-3.5 py-2 bg-surface-container-low border-t border-outline-variant/60 flex items-center justify-between text-[10px] text-ink-muted">
            <span>{t.quickJump.footerHint}</span>
            {loading ? (
              <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                <Loader2
                  role="status"
                  aria-label={t.quickJump.searching}
                  className="w-3 h-3 animate-spin"
                />
                {t.quickJump.searching}
              </span>
            ) : null}
          </div>
        </FloatingSurface>
      )}
    </div>
  );
}
