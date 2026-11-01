"use client";

import {
  colsToSize,
  type CustomArchiveFolder,
  DASHBOARD_PRESETS,
  type DashboardDesk,
  type DashboardLayoutItem,
  type DashboardPresetId,
  type DashboardWidgetKind,
  type DashboardWidgetSize,
  dashboardWidget,
  sizeToCols,
  widgetGridBounds,
} from "@platform/database/constants/dashboard";
import { formatMessage } from "@platform/locales";
import { Button, Select, useConfirmation, useDialog } from "@platform/ui";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock,
  CloudSun,
  Eye,
  FolderKanban,
  GripVertical,
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  resetDashboardLayoutAction,
  saveDashboardLayoutAction,
} from "../../app/actions/dashboard";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { DashboardData } from "../../lib/dashboard-widgets";
import { errorMessage } from "../../lib/error-text";
import { DashboardWidget } from "./DashboardWidgets";
import {
  SUPPORTED_CURRENCIES,
  WEATHER_CITIES_BY_COUNTRY,
  WEATHER_CITY_PRESETS,
  WORLD_CLOCK_CITIES,
} from "./LifestyleWidgets";
import { PageHeader } from "../layout/PageHeader";

export interface CatalogueEntry {
  id: string;
  kind: DashboardWidgetKind;
  sizes: readonly DashboardWidgetSize[];
  defaultSize: DashboardWidgetSize;
}

type CategoryFilter = "all" | "kpi" | "work" | "folder" | "lifestyle";

const COL_SPAN_BY_COLS: Record<number, string> = {
  1: "col-span-12 md:col-span-6 xl:col-span-3",
  2: "col-span-12 md:col-span-6 xl:col-span-6",
  3: "col-span-12 md:col-span-12 xl:col-span-9",
  4: "col-span-12",
};

const ROW_SPAN_CLASSES: Record<number, string> = {
  1: "row-span-1 min-h-[148px]",
  2: "row-span-2 min-h-[308px]",
  3: "row-span-3 min-h-[468px]",
  4: "row-span-4 min-h-[628px]",
};

function kindToCategory(kind: DashboardWidgetKind): CategoryFilter {
  if (kind === "kpi") return "kpi";
  if (kind === "folder") return "folder";
  if (kind === "lifestyle") return "lifestyle";
  return "work";
}

/** Realistic fallback preview data used while customizing the dashboard before hitting "Done". */
function withPreviewFallbackData(data: DashboardData): DashboardData {
  return {
    ...data,
    finance: data.finance ?? {
      revenue: 14250,
      outstanding: 3420,
      overdue: 450,
      expenses: 4180,
      netProfit: 10070,
      profitMargin: 70.6,
      discountsGiven: 320,
      vatCollected: 1425,
      currency: "BHD",
    },
    cashflow: data.cashflow ?? [
      { monthKey: "2026-05", revenue: 11200, expenses: 3800 },
      { monthKey: "2026-06", revenue: 12800, expenses: 4100 },
      { monthKey: "2026-07", revenue: 13500, expenses: 3900 },
      { monthKey: "2026-08", revenue: 14900, expenses: 4200 },
    ],
    deals: data.deals ?? {
      activeCount: 8,
      activePipelineValue: 18500,
      stageStats: {
        lead: { count: 3, value: 6500 },
        proposal_sent: { count: 5, value: 12000 },
      },
      recent: [],
    },
    leads: data.leads ?? 12,
    orders: data.orders ?? {
      open: 6,
      today_count: 4,
      today_total: 840,
    },
    shipments: data.shipments ?? {
      late: 0,
      pending: 4,
      out_for_delivery: 2,
    },
    tasks: data.tasks ?? {
      open: 7,
      overdue: 0,
      tasks: [],
    },
    hrPulse: data.hrPulse ?? {
      active: 24,
      on_leave: 2,
      pending_leave: 1,
    },
    procurementPulse: data.procurementPulse ?? {
      open_orders: 3,
      open_requisitions: 2,
    },
    archiveFolders: data.archiveFolders ?? {
      groups: [
        { group: "company", count: 8 },
        { group: "legal", count: 14 },
        { group: "finance", count: 19 },
        { group: "hr", count: 12 },
      ],
      expiring: 1,
      expired: 0,
      recent: [],
    },
  };
}

const KPI_PREVIEW_SAMPLES: Record<
  string,
  { value: string; delta: string; tone: string; barWidth: string }
> = {
  kpi_revenue: {
    value: "14,250",
    delta: "+12%",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    barWidth: "w-4/5 bg-emerald-500",
  },
  kpi_receivables: {
    value: "3,420",
    delta: "4",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    barWidth: "w-2/5 bg-amber-500",
  },
  kpi_expenses: {
    value: "4,180",
    delta: "-3%",
    tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    barWidth: "w-1/2 bg-rose-500",
  },
  kpi_profit: {
    value: "70.6%",
    delta: "+4.2%",
    tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    barWidth: "w-3/4 bg-teal-500",
  },
  kpi_pipeline: {
    value: "18,500",
    delta: "8",
    tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    barWidth: "w-2/3 bg-sky-500",
  },
  kpi_leads: {
    value: "12",
    delta: "+5",
    tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    barWidth: "w-3/5 bg-violet-500",
  },
  kpi_orders: {
    value: "6",
    delta: "840",
    tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    barWidth: "w-1/2 bg-indigo-500",
  },
  kpi_shipments: {
    value: "4",
    delta: "2",
    tone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    barWidth: "w-2/3 bg-cyan-500",
  },
  kpi_tasks: {
    value: "7",
    delta: "0",
    tone: "bg-primary/15 text-primary",
    barWidth: "w-3/4 bg-primary",
  },
  hr_pulse: {
    value: "24",
    delta: "2",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    barWidth: "w-4/5 bg-emerald-500",
  },
  procurement_pulse: {
    value: "3",
    delta: "2",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    barWidth: "w-1/2 bg-amber-500",
  },
};

/**
 * Distinct miniature Google Pixel / Material Design 3 visual thumbnail rendered inside the widget picker.
 */
function WidgetMiniPreview({
  id,
  kind,
}: {
  id: string;
  kind: DashboardWidgetKind;
}) {
  if (id === "clock_local") {
    return (
      <div className="h-14 rounded-xl bg-gradient-to-br from-primary/15 via-surface-container-highest to-accent/10 p-2 flex items-center justify-center gap-3 border border-outline-variant/40">
        <div
          data-keep-round="true"
          className="w-10 h-10 rounded-full bg-secondary-container border-2 border-primary/35 flex items-center justify-center relative shadow-2xs"
        >
          <span className="w-0.5 h-3 bg-primary rounded-full origin-bottom -translate-y-1 rotate-45" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary absolute" />
        </div>
        <div dir="ltr" className="text-lg font-black text-ink tabular-nums">
          09:41
        </div>
      </div>
    );
  }

  if (id === "clock_world") {
    return (
      <div className="h-14 rounded-xl bg-gradient-to-br from-sky-500/12 via-surface-container-highest to-primary/10 p-2 grid grid-cols-2 gap-1.5 border border-outline-variant/40">
        <div
          dir="ltr"
          className="rounded-lg bg-surface-container-lowest/80 px-2 py-1 flex items-center justify-between text-[10px] font-extrabold text-ink tabular-nums"
        >
          <span>🇧🇭 +3</span>
          <span>10:41</span>
        </div>
        <div
          dir="ltr"
          className="rounded-lg bg-surface-container-lowest/80 px-2 py-1 flex items-center justify-between text-[10px] font-extrabold text-ink tabular-nums"
        >
          <span>🇬🇧 +0</span>
          <span>07:41</span>
        </div>
      </div>
    );
  }

  if (id === "weather_local") {
    return (
      <div className="h-14 rounded-xl bg-gradient-to-br from-sky-500/15 via-surface-container-highest to-amber-500/15 p-2 flex items-center justify-between px-3 border border-outline-variant/40">
        <div dir="ltr" className="text-base font-black text-ink tabular-nums">
          29°
        </div>
        <div className="flex items-center gap-1.5">
          <span
            data-keep-round="true"
            className="w-6 h-6 rounded-full bg-amber-400/85 inline-block shadow-2xs"
          />
          <div className="flex gap-0.5">
            <span className="w-2 h-6 rounded-full bg-sky-500/30" />
            <span className="w-2 h-6 rounded-full bg-amber-500/30" />
            <span className="w-2 h-6 rounded-full bg-sky-500/30" />
          </div>
        </div>
      </div>
    );
  }

  if (id === "quick_calculator") {
    return (
      <div
        dir="ltr"
        className="h-14 rounded-xl bg-surface-container-highest/85 p-2 flex items-center justify-between gap-2 border border-outline-variant/40"
      >
        <div className="rounded-lg bg-surface-container-lowest px-2.5 py-1 text-xs font-black text-ink tabular-nums">
          1,250
        </div>
        <div className="grid grid-cols-2 gap-1">
          <span className="w-5 h-4 rounded bg-primary/25 text-primary text-[9px] font-bold flex items-center justify-center">
            +
          </span>
          <span className="w-5 h-4 rounded bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center">
            =
          </span>
        </div>
      </div>
    );
  }

  if (id === "currency_rates") {
    return (
      <div
        dir="ltr"
        className="h-14 rounded-xl bg-gradient-to-br from-emerald-500/12 to-surface-container-highest p-2 flex items-center justify-between px-3 border border-outline-variant/40 text-[10px] font-extrabold text-ink tabular-nums"
      >
        <span className="rounded-md bg-primary/15 text-primary px-2 py-1">
          100.00
        </span>
        <span>→</span>
        <span className="rounded-md bg-surface-container-lowest px-2 py-1">
          265.00
        </span>
      </div>
    );
  }

  if (id === "countdown_milestone") {
    return (
      <div
        dir="ltr"
        className="h-14 rounded-xl bg-gradient-to-br from-primary/12 to-surface-container-highest p-2 grid grid-cols-3 gap-1.5 border border-outline-variant/40 text-center"
      >
        {["14", "08", "45"].map((v, i) => (
          <div
            key={i}
            className="rounded-lg bg-surface-container-lowest/85 py-1 text-xs font-black text-primary tabular-nums"
          >
            {v}
          </div>
        ))}
      </div>
    );
  }

  if (id === "welcome_profile" || id === "sticky_quote") {
    return (
      <div className="h-14 rounded-xl bg-gradient-to-br from-primary/15 via-surface-container-highest to-accent/10 p-2.5 flex items-center justify-between gap-2 border border-outline-variant/40">
        <div className="space-y-1 flex-1">
          <div className="h-2 w-12 rounded-full bg-primary/45" />
          <div className="h-2.5 w-24 rounded-full bg-ink/65" />
        </div>
        <div
          data-keep-round="true"
          className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 shrink-0"
        />
      </div>
    );
  }

  if (id === "calendar_mini") {
    return (
      <div className="h-14 rounded-xl bg-surface-container-highest/80 p-2 flex flex-col justify-between border border-outline-variant/40">
        <div className="flex items-center justify-between">
          <span className="h-2 w-12 rounded-full bg-primary/50" />
          <span className="h-2 w-6 rounded-full bg-secondary-container" />
        </div>
        <div className="grid grid-cols-7 gap-1 px-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${
                i === 5 ? "bg-primary" : "bg-ink-muted/25"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (id === "scratchpad_notes") {
    return (
      <div className="h-14 rounded-xl bg-gradient-to-br from-amber-500/15 to-surface-container-highest p-2.5 flex flex-col justify-between border border-amber-500/25">
        <div className="h-2 w-14 rounded-full bg-amber-500/50" />
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-ink/25" />
          <div className="h-1.5 w-3/4 rounded-full bg-ink/25" />
        </div>
      </div>
    );
  }

  if (id === "focus_pomodoro") {
    return (
      <div className="h-14 rounded-xl bg-gradient-to-br from-rose-500/15 to-surface-container-highest p-2 flex items-center justify-center gap-3 border border-outline-variant/40">
        <div
          data-keep-round="true"
          className="w-9 h-9 rounded-full border-[3px] border-primary flex items-center justify-center text-[9px] font-black text-ink tabular-nums"
        >
          25:00
        </div>
        <div className="space-y-1">
          <div className="h-3 w-10 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-ink-muted/30" />
        </div>
      </div>
    );
  }

  if (kind === "folder" || id === "bookmarks_launchpad") {
    return (
      <div className="h-14 rounded-xl bg-surface-container-highest/80 p-2 grid grid-cols-2 gap-1.5 border border-outline-variant/40">
        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/25 p-1.5 flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/60 shrink-0" />
          <span className="h-1.5 w-8 rounded-full bg-ink/50" />
        </div>
        <div className="rounded-lg bg-amber-500/15 border border-amber-500/25 p-1.5 flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500/60 shrink-0" />
          <span className="h-1.5 w-8 rounded-full bg-ink/50" />
        </div>
      </div>
    );
  }

  if (kind === "chart") {
    return (
      <div className="h-14 rounded-xl bg-surface-container-highest/80 p-2.5 flex items-end justify-between gap-1.5 border border-outline-variant/40">
        {[40, 65, 50, 85, 70, 95].map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={`flex-1 rounded-t-md ${
              i % 2 === 0 ? "bg-primary/75" : "bg-accent/55"
            }`}
          />
        ))}
      </div>
    );
  }

  if (kind === "kpi") {
    const sample = KPI_PREVIEW_SAMPLES[id] ?? {
      value: "24",
      delta: "+8%",
      tone: "bg-primary/15 text-primary",
      barWidth: "w-2/3 bg-primary",
    };
    return (
      <div
        dir="ltr"
        className="h-14 rounded-xl bg-surface-container-highest/80 px-3 py-2 flex flex-col justify-between border border-outline-variant/40"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-ink tabular-nums">
            {sample.value}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold tabular-nums ${sample.tone}`}
          >
            {sample.delta}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
          <div className={`h-full rounded-full ${sample.barWidth}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-14 rounded-xl bg-surface-container-highest/80 p-2.5 flex flex-col justify-between border border-outline-variant/40">
      <div className="flex items-center justify-between">
        <span className="h-2 w-16 rounded-full bg-primary/50" />
        <span className="h-2 w-6 rounded-full bg-ink-muted/30" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-ink/20" />
        <div className="h-2 w-4/5 rounded-full bg-ink/15" />
      </div>
    </div>
  );
}

export function DashboardBoard({
  desk: _desk,
  layout: initialLayout,
  custom: _custom,
  available,
  data,
  loaded: _loaded,
  showDepartment: showDepartmentLink,
}: {
  desk?: DashboardDesk;
  layout: DashboardLayoutItem[];
  custom?: boolean;
  available: string[];
  data: DashboardData;
  loaded?: string[];
  showDepartment?: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;
  const router = useRouter();
  const requestConfirmation = useConfirmation();

  const catalogue = useMemo<CatalogueEntry[]>(
    () =>
      available
        .map((id) => dashboardWidget(id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w))
        .map((w) => ({
          id: w.id,
          kind: w.kind,
          sizes: w.sizes,
          defaultSize: w.defaultSize,
        })),
    [available],
  );

  const [savedSnapshot, setSavedSnapshot] =
    useState<DashboardLayoutItem[]>(initialLayout);
  const [layout, setLayout] = useState<DashboardLayoutItem[]>(initialLayout);
  const [customFolders, setCustomFolders] = useState<CustomArchiveFolder[]>(
    data.customFolders ?? [],
  );
  const [customizing, setCustomizing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [configuringIndex, setConfiguringIndex] = useState<number | null>(null);
  const [previewCatalogueId, setPreviewCatalogueId] = useState<string | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [activeResize, setActiveResize] = useState<{
    index: number;
    cols: number;
    rows: number;
  } | null>(null);

  React.useEffect(() => {
    setLayout(initialLayout);
    setSavedSnapshot(initialLayout);
  }, [initialLayout]);

  React.useEffect(() => {
    if (data.customFolders) {
      setCustomFolders(data.customFolders);
    }
  }, [data.customFolders]);

  const byId = useMemo(
    () => new Map(catalogue.map((c) => [c.id, c])),
    [catalogue],
  );
  const onBoard = useMemo(() => new Set(layout.map((w) => w.id)), [layout]);
  const addable = useMemo(
    () => catalogue.filter((c) => !onBoard.has(c.id)),
    [catalogue, onBoard],
  );

  const filteredAddable = useMemo(() => {
    const q = widgetSearch.trim().toLowerCase();
    return addable.filter((c) => {
      if (activeCategory !== "all" && kindToCategory(c.kind) !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const title = (
        (b.widgets as Record<string, string>)[c.id] ?? c.id
      ).toLowerCase();
      const hint = (
        (b.widgetHints as Record<string, string>)[c.id] ?? ""
      ).toLowerCase();
      return title.includes(q) || hint.includes(q) || c.id.includes(q);
    });
  }, [addable, activeCategory, widgetSearch, b.widgets, b.widgetHints]);

  const boardData = useMemo(() => {
    const base = customizing ? withPreviewFallbackData(data) : data;
    return {
      ...base,
      customFolders,
    };
  }, [data, customFolders, customizing]);

  const getWidgetColsAndRows = (item: DashboardLayoutItem) => {
    const bounds = widgetGridBounds(item.id);
    const cols = Math.max(
      bounds.minCols,
      Math.min(bounds.maxCols, sizeToCols(item.size)),
    );
    const rawRows =
      typeof item.settings?.rowSpan === "number"
        ? item.settings.rowSpan
        : bounds.defaultRows;
    const rows = Math.max(
      bounds.minRows,
      Math.min(bounds.maxRows, Math.round(rawRows)),
    );
    return { cols, rows, bounds };
  };

  const setWidgetGridDimensions = (
    index: number,
    nextCols: number,
    nextRows: number,
  ) => {
    setLayout((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        const entry = byId.get(item.id);
        const bounds = widgetGridBounds(item.id);
        const clampedCols = Math.max(
          bounds.minCols,
          Math.min(bounds.maxCols, nextCols),
        );
        const clampedRows = Math.max(
          bounds.minRows,
          Math.min(bounds.maxRows, nextRows),
        );
        const nextSize = colsToSize(clampedCols, entry?.sizes);
        return {
          ...item,
          size: nextSize,
          settings: {
            ...(item.settings ?? {}),
            rowSpan: clampedRows,
          },
        };
      }),
    );
  };

  /**
   * Android Launcher-style pointer-drag resize handler (Corner, Inline-End Edge, or Bottom Edge).
   * Measures the dashboard grid viewport to compute column width and row height, respecting min/max bounds.
   */
  const startPointerResize = (
    e: React.PointerEvent,
    index: number,
    axis: "both" | "col" | "row",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const item = layout[index];
    if (!item) return;

    const { cols: startCols, rows: startRows, bounds } =
      getWidgetColsAndRows(item);
    const startX = e.clientX;
    const startY = e.clientY;
    const isRtl = locale === "ar";

    const gridRect = gridRef.current?.getBoundingClientRect();
    const viewportW = typeof window !== "undefined" ? window.innerWidth : 1440;
    const maxViewportCols = viewportW >= 1280 ? 4 : viewportW >= 768 ? 2 : 1;
    const colUnitPx = gridRect
      ? Math.max(140, gridRect.width / maxViewportCols)
      : 280;
    const rowUnitPx = 156;

    setActiveResize({ index, cols: startCols, rows: startRows });

    const onMove = (moveEvent: PointerEvent) => {
      const rawDx = moveEvent.clientX - startX;
      const dx = isRtl ? -rawDx : rawDx;
      const dy = moveEvent.clientY - startY;

      const deltaCols = axis === "row" ? 0 : Math.round(dx / colUnitPx);
      const deltaRows = axis === "col" ? 0 : Math.round(dy / rowUnitPx);

      const nextCols = Math.max(
        bounds.minCols,
        Math.min(bounds.maxCols, startCols + deltaCols),
      );
      const nextRows = Math.max(
        bounds.minRows,
        Math.min(bounds.maxRows, startRows + deltaRows),
      );

      setActiveResize({ index, cols: nextCols, rows: nextRows });
      setWidgetGridDimensions(index, nextCols, nextRows);
    };

    const onUp = () => {
      setActiveResize(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= layout.length || from === to) return;
    setLayout((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const remove = (index: number) => {
    setLayout((current) => current.filter((_, i) => i !== index));
  };

  const addById = (
    id: string,
    customSettings?: Record<string, string | number | boolean>,
    customSize?: DashboardWidgetSize,
  ) => {
    const entry = byId.get(id);
    if (!entry || onBoard.has(id)) return;
    const bounds = widgetGridBounds(id);
    setLayout((current) => [
      ...current,
      {
        id: entry.id,
        size: customSize ?? entry.defaultSize,
        settings: {
          rowSpan: bounds.defaultRows,
          ...(customSettings ?? {}),
        },
      },
    ]);
  };

  const updateWidgetSettings = (
    index: number,
    patch: Record<string, string | number | boolean>,
  ) => {
    const nextLayout = layout.map((item, i) =>
      i === index
        ? {
            ...item,
            settings: { ...(item.settings ?? {}), ...patch },
          }
        : item,
    );
    setLayout(nextLayout);
    if (!customizing) {
      startTransition(async () => {
        await saveDashboardLayoutAction(nextLayout);
      });
    }
  };

  const saveAndClose = () => {
    startTransition(async () => {
      try {
        const res = await saveDashboardLayoutAction(layout);
        if (res.success) {
          setSavedSnapshot(res.layout);
          setLayout(res.layout);
          setCustomizing(false);
          toast.success(b.saved);
          router.refresh();
        }
      } catch (err) {
        toast.error(errorMessage(err, t));
      }
    });
  };

  const cancelCustomization = () => {
    setLayout(savedSnapshot);
    setCustomizing(false);
  };

  const handleApplyPreset = (presetId: DashboardPresetId) => {
    if (presetId === "role_default") {
      reset();
      return;
    }
    const rawIds = DASHBOARD_PRESETS[presetId] ?? [];
    const nextLayout: DashboardLayoutItem[] = rawIds
      .filter((id) => byId.has(id))
      .map((id) => {
        const entry = byId.get(id);
        const bounds = widgetGridBounds(id);
        return {
          id,
          size: entry?.defaultSize ?? "m",
          settings: { rowSpan: bounds.defaultRows },
        };
      });
    setLayout(nextLayout);
  };

  const reset = () => {
    requestConfirmation({
      title: b.reset,
      description: b.resetConfirm,
      variant: "danger",
      onConfirm: () => {
        startTransition(async () => {
          try {
            const res = await resetDashboardLayoutAction();
            if (res.success) {
              setCustomizing(false);
              toast.success(b.resetDone);
              router.refresh();
            }
          } catch (err) {
            toast.error(errorMessage(err, t));
          }
        });
      },
    });
  };

  const widgetTitle = (id: string) =>
    (b.widgets as Record<string, string>)[id] ?? id;
  const widgetHint = (id: string) =>
    (b.widgetHints as Record<string, string>)[id] ?? "";

  const categories: { id: CategoryFilter; label: string; icon: React.ReactNode }[] = [
    {
      id: "all",
      label: b.categories.all,
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
    },
    {
      id: "kpi",
      label: b.categories.kpi,
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      id: "work",
      label: b.categories.work,
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      id: "folder",
      label: b.categories.folder,
      icon: <FolderKanban className="w-3.5 h-3.5" />,
    },
    {
      id: "lifestyle",
      label: b.categories.lifestyle,
      icon: <CloudSun className="w-3.5 h-3.5" />,
    },
  ];

  const presets: { id: DashboardPresetId; label: string }[] = [
    { id: "executive_command", label: b.presets.executive_command },
    { id: "finance_focus", label: b.presets.finance_focus },
    { id: "sales_commercial", label: b.presets.sales_commercial },
    { id: "operations_logistics", label: b.presets.operations_logistics },
    { id: "hr_people", label: b.presets.hr_people },
    { id: "lifestyle_balanced", label: b.presets.lifestyle_balanced },
  ];

  const configuringItem =
    configuringIndex !== null ? layout[configuringIndex] : null;
  const configuringCatalogue = configuringItem
    ? byId.get(configuringItem.id)
    : null;
  const previewCatalogueEntry = previewCatalogueId
    ? byId.get(previewCatalogueId)
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        meta={
          showDepartmentLink ? (
            <Link
              href={ROUTES.departmentDashboard()}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-accent/50 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              {b.myDepartment}
            </Link>
          ) : null
        }
        actions={
          customizing ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 text-primary px-3 py-1 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {b.livePreviewBadge}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={pending}
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                {b.reset}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelCustomization}
                disabled={pending}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                {b.cancelEdit}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={saveAndClose}
                disabled={pending}
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                {b.done}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCustomizing(true)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              {b.customize}
            </Button>
          )
        }
      />

      {/* Streamlined Material Design 3 Widget Drawer (Zero Redundancy) */}
      {customizing ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-3.5 shadow-xs">
          {/* Unified Header Row: Search + Category Filter Pills + Preset Layout Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeCategory === cat.id
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-surface-container-lowest border border-outline-variant/60 text-ink-muted hover:text-ink"
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-56">
                <Search
                  className="w-3.5 h-3.5 text-ink-muted absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={widgetSearch}
                  onChange={(e) => setWidgetSearch(e.target.value)}
                  placeholder={b.searchWidgetsPlaceholder}
                  aria-label={b.searchWidgetsPlaceholder}
                  className="w-full h-9 rounded-full bg-surface-container-lowest border border-outline-variant ps-8 pe-3 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="w-48 sm:w-56">
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleApplyPreset(e.target.value as DashboardPresetId);
                    }
                  }}
                  aria-label={b.presetLayouts}
                  className="h-9 text-xs"
                >
                  <option value="">{b.presetLayouts}</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Clean Visual Widget Catalogue Grid */}
          {filteredAddable.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pe-1 pt-0.5">
              {filteredAddable.map((w) => {
                const bounds = widgetGridBounds(w.id);
                const defCols = sizeToCols(w.defaultSize);
                const defRows = bounds.defaultRows;
                return (
                  <div
                    key={w.id}
                    className="flex flex-col justify-between gap-2.5 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest hover:border-primary/60 p-3 text-start transition-all group hover:shadow-xs"
                  >
                    <WidgetMiniPreview id={w.id} kind={w.kind} />

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-ink group-hover:text-primary truncate">
                            {widgetTitle(w.id)}
                          </span>
                          <span
                            dir="ltr"
                            className="inline-flex items-center rounded-md bg-surface-container-highest px-1.5 py-0.2 text-[10px] font-bold text-ink-muted shrink-0 tabular-nums"
                          >
                            {formatMessage(b.gridSizeBadge, {
                              cols: defCols,
                              rows: defRows,
                            })}
                          </span>
                        </div>
                        {widgetHint(w.id) ? (
                          <div className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                            {widgetHint(w.id)}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewCatalogueId(w.id)}
                          disabled={pending}
                          className="w-7 h-7 rounded-full bg-surface-container-high text-ink-muted hover:text-primary hover:bg-secondary-container flex items-center justify-center transition-colors"
                          title={b.previewWidget}
                          aria-label={b.previewWidget}
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => addById(w.id)}
                          disabled={pending}
                          className="w-7 h-7 rounded-full bg-primary/15 text-primary group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center transition-colors"
                          title={b.addWidget}
                          aria-label={b.addWidget}
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted py-2">{b.nothingToAdd}</p>
          )}
        </div>
      ) : null}

      {layout.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-8 text-center text-sm text-ink-muted">
          {b.empty}
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-12 gap-5 auto-rows-[minmax(148px,auto)]"
          data-testid="dashboard-grid"
        >
          {layout.map((item, index) => {
            const name = widgetTitle(item.id);
            const { cols, rows } = getWidgetColsAndRows(item);
            const colSpanClass = COL_SPAN_BY_COLS[cols] ?? COL_SPAN_BY_COLS[2];
            const rowSpanClass = ROW_SPAN_CLASSES[rows] ?? ROW_SPAN_CLASSES[2];
            const isBeingResized = activeResize?.index === index;

            return (
              <div
                key={item.id}
                draggable={customizing && !isBeingResized}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  if (customizing) e.preventDefault();
                }}
                onDrop={() => {
                  if (dragIndex !== null) move(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`${colSpanClass} ${rowSpanClass} flex flex-col relative transition-all duration-200 ${
                  customizing
                    ? "rounded-[var(--admin-card-radius)] ring-2 ring-primary/35 hover:ring-primary bg-surface-container-lowest/40 p-1.5"
                    : ""
                } ${dragIndex === index ? "opacity-50 scale-[0.98]" : ""}`}
              >
                {customizing ? (
                  <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 mb-1.5 text-xs text-ink-muted bg-surface-container-high/90 rounded-[var(--admin-inner-radius)]">
                    <span
                      className="inline-flex items-center gap-1.5 font-bold text-ink truncate cursor-grab active:cursor-grabbing"
                      title={formatMessage(b.drag, { name })}
                    >
                      <GripVertical
                        className="w-3.5 h-3.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        dir="ltr"
                        className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-black tabular-nums"
                        title={b.resizeCornerHint}
                      >
                        {formatMessage(b.gridSizeBadge, { cols, rows })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfiguringIndex(index)}
                        aria-label={formatMessage(b.configureWidget, { name })}
                        title={formatMessage(b.configureWidget, { name })}
                        className="p-1 rounded-md hover:bg-primary/15 text-primary transition-colors"
                      >
                        <SlidersHorizontal
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        aria-label={formatMessage(b.moveEarlier, { name })}
                        className="p-1 rounded-md hover:bg-surface-container disabled:opacity-30"
                      >
                        <ArrowLeft
                          className="w-3.5 h-3.5 rtl:-scale-x-100"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, index + 1)}
                        disabled={index === layout.length - 1}
                        aria-label={formatMessage(b.moveLater, { name })}
                        className="p-1 rounded-md hover:bg-surface-container disabled:opacity-30"
                      >
                        <ArrowRight
                          className="w-3.5 h-3.5 rtl:-scale-x-100"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        aria-label={formatMessage(b.remove, { name })}
                        className="p-1 rounded-md hover:bg-rose-500/10 text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex-1 min-h-0 flex flex-col">
                  <DashboardWidget
                    id={item.id}
                    data={boardData}
                    settings={item.settings}
                    onUpdateSettings={(patch) =>
                      updateWidgetSettings(index, patch)
                    }
                  />
                </div>

                {/* Android Home Screen 2D Resize Handles (Corner + Inline-End Edge + Bottom Edge) */}
                {customizing ? (
                  <>
                    {/* Inline-End Edge Handle (Width / Columns) */}
                    <div
                      onPointerDown={(e) => startPointerResize(e, index, "col")}
                      title={b.resizeCornerHint}
                      className="absolute top-1/2 -translate-y-1/2 end-0 w-2.5 h-10 rounded-full bg-primary/40 hover:bg-primary cursor-ew-resize z-20 transition-colors"
                    />
                    {/* Bottom Edge Handle (Height / Rows) */}
                    <div
                      onPointerDown={(e) => startPointerResize(e, index, "row")}
                      title={b.resizeCornerHint}
                      className="absolute bottom-0 start-1/2 -translate-x-1/2 h-2.5 w-10 rounded-full bg-primary/40 hover:bg-primary cursor-ns-resize z-20 transition-colors"
                    />
                    {/* Bottom-End Corner Handle (2D Columns × Rows) */}
                    <div
                      onPointerDown={(e) =>
                        startPointerResize(e, index, "both")
                      }
                      title={b.resizeCornerHint}
                      className="absolute bottom-0.5 end-0.5 w-6 h-6 rounded-full bg-primary text-on-primary shadow-sm flex items-center justify-center cursor-nwse-resize rtl:cursor-nesw-resize z-30 hover:scale-110 transition-transform"
                    >
                      <svg
                        viewBox="0 0 12 12"
                        className="w-3 h-3 fill-none stroke-current rtl:-scale-x-100"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M 3 9 L 9 9 L 9 3" />
                      </svg>
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Interactive Preview Modal Before Adding a Widget from Catalogue (Portaled to document.body, No Black Blur) */}
      {previewCatalogueEntry ? (
        <WidgetPreviewModal
          entry={previewCatalogueEntry}
          title={widgetTitle(previewCatalogueEntry.id)}
          hint={widgetHint(previewCatalogueEntry.id)}
          boardData={withPreviewFallbackData(boardData)}
          onClose={() => setPreviewCatalogueId(null)}
          onAdd={() => {
            addById(previewCatalogueEntry.id);
            setPreviewCatalogueId(null);
          }}
        />
      ) : null}

      {/* Per-Widget Material Design 3 Settings & Live Preview Modal */}
      {configuringItem && configuringIndex !== null ? (
        <WidgetSettingsModal
          item={configuringItem}
          catalogueEntry={configuringCatalogue ?? undefined}
          title={widgetTitle(configuringItem.id)}
          boardData={withPreviewFallbackData(boardData)}
          onClose={() => setConfiguringIndex(null)}
          onApply={(nextSize, nextSettings) => {
            setLayout((current) =>
              current.map((w, idx) =>
                idx === configuringIndex
                  ? { ...w, size: nextSize, settings: nextSettings }
                  : w,
              ),
            );
            setConfiguringIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}

function WidgetPreviewModal({
  entry,
  title,
  hint,
  boardData,
  onClose,
  onAdd,
}: {
  entry: CatalogueEntry;
  title: string;
  hint: string;
  boardData: DashboardData;
  onClose: () => void;
  onAdd: () => void;
}) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dialog = useDialog(mounted, onClose);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-modal-container
      data-kind="form"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        {...dialog}
        data-modal-card
        className="relative z-10 w-full max-w-2xl max-h-[calc(100dvh-48px)] flex flex-col rounded-[var(--admin-dialog-radius)] bg-surface-container-high border border-outline-variant shadow-[var(--admin-popup-shadow)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          role="presentation"
          data-modal-header
          className="flex items-center justify-between gap-3 px-6 py-4 border-b border-outline-variant/60"
        >
          <div>
            <h2 className="text-base font-extrabold text-ink">{title}</h2>
            <p className="text-xs text-ink-muted">{hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-highest text-ink-muted hover:text-ink flex items-center justify-center"
            aria-label={b.cancelEdit}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        <div data-dialog-body className="p-6 bg-surface-container-lowest/60 overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
            {b.widgetLivePreview}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <DashboardWidget id={entry.id} data={boardData} />
          </div>
        </div>

        <footer
          role="presentation"
          data-modal-footer
          className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/60 bg-surface-container-low"
        >
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {b.cancelEdit}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onAdd}>
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {b.addToDashboard}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function WidgetSettingsModal({
  item,
  catalogueEntry,
  title,
  boardData,
  onClose,
  onApply,
}: {
  item: DashboardLayoutItem;
  catalogueEntry?: CatalogueEntry;
  title: string;
  boardData: DashboardData;
  onClose: () => void;
  onApply: (
    nextSize: DashboardWidgetSize,
    nextSettings: Record<string, string | number | boolean>,
  ) => void;
}) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;

  const bounds = widgetGridBounds(item.id);
  const [draftSize, setDraftSize] = useState<DashboardWidgetSize>(item.size);
  const [draftSettings, setDraftSettings] = useState<
    Record<string, string | number | boolean>
  >(() => ({
    rowSpan: bounds.defaultRows,
    ...(item.settings ?? {}),
  }));

  const currentCols = Math.max(
    bounds.minCols,
    Math.min(bounds.maxCols, sizeToCols(draftSize)),
  );
  const currentRows =
    typeof draftSettings.rowSpan === "number"
      ? Math.max(bounds.minRows, Math.min(bounds.maxRows, draftSettings.rowSpan))
      : bounds.defaultRows;

  const patchDraft = (patch: Record<string, string | number | boolean>) => {
    setDraftSettings((prev) => ({ ...prev, ...patch }));
  };

  const themes = [
    { id: "default", label: b.widgetThemes.default, swatch: "bg-surface-container-highest" },
    { id: "primary", label: b.widgetThemes.primary, swatch: "bg-primary" },
    { id: "secondary", label: b.widgetThemes.secondary, swatch: "bg-secondary-container" },
    { id: "tertiary", label: b.widgetThemes.tertiary, swatch: "bg-accent" },
    { id: "emerald", label: b.widgetThemes.emerald, swatch: "bg-emerald-500" },
    { id: "amber", label: b.widgetThemes.amber, swatch: "bg-amber-500" },
    { id: "sky", label: b.widgetThemes.sky, swatch: "bg-sky-500" },
    { id: "rose", label: b.widgetThemes.rose, swatch: "bg-rose-500" },
  ];

  const surfaces = [
    { id: "tonal", label: b.widgetSurfaces.tonal },
    { id: "elevated", label: b.widgetSurfaces.elevated },
    { id: "outlined", label: b.widgetSurfaces.outlined },
  ];

  const currentTheme =
    typeof draftSettings.theme === "string" ? draftSettings.theme : "default";
  const currentSurface =
    typeof draftSettings.surface === "string" ? draftSettings.surface : "tonal";

  // Helper for World Clock multi-city selection
  const selectedWorldZones = useMemo(() => {
    const raw =
      typeof draftSettings.zones === "string"
        ? draftSettings.zones
        : "manama,riyadh,dubai,london";
    return new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }, [draftSettings.zones]);

  const toggleWorldZone = (key: string) => {
    const next = new Set(selectedWorldZones);
    if (next.has(key)) {
      if (next.size <= 1) return; // keep at least 1 city
      next.delete(key);
    } else {
      next.add(key);
    }
    patchDraft({ zones: Array.from(next).join(",") });
  };

  // Helper for Weather Country & City selection
  const currentWeatherCity =
    typeof draftSettings.city === "string" &&
    draftSettings.city in WEATHER_CITY_PRESETS
      ? draftSettings.city
      : "manama";
  const currentWeatherCountry =
    WEATHER_CITY_PRESETS[currentWeatherCity]?.countryCode ?? "bh";
  const citiesForWeatherCountry =
    WEATHER_CITIES_BY_COUNTRY[currentWeatherCountry] ?? ["manama"];

  // Helper for Currency Converter targets
  const selectedCurrencyTargets = useMemo(() => {
    const raw =
      typeof draftSettings.targets === "string"
        ? draftSettings.targets
        : "SAR,AED,USD,EUR";
    return new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }, [draftSettings.targets]);

  const toggleCurrencyTarget = (code: string) => {
    const next = new Set(selectedCurrencyTargets);
    if (next.has(code)) {
      if (next.size <= 1) return;
      next.delete(code);
    } else {
      next.add(code);
    }
    patchDraft({ targets: Array.from(next).join(",") });
  };

  const allowedColOptions = useMemo(() => {
    const list: number[] = [];
    for (let c = bounds.minCols; c <= bounds.maxCols; c++) list.push(c);
    return list;
  }, [bounds.minCols, bounds.maxCols]);

  const allowedRowOptions = useMemo(() => {
    const list: number[] = [];
    for (let r = bounds.minRows; r <= bounds.maxRows; r++) list.push(r);
    return list;
  }, [bounds.minRows, bounds.maxRows]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dialog = useDialog(mounted, onClose);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-modal-container
      data-kind="form"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        {...dialog}
        data-modal-card
        className="relative z-10 w-full max-w-3xl max-h-[calc(100dvh-48px)] flex flex-col rounded-[var(--admin-dialog-radius)] bg-surface-container-high border border-outline-variant shadow-[var(--admin-popup-shadow)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          role="presentation"
          data-modal-header
          className="flex items-center justify-between gap-3 px-6 py-4 border-b border-outline-variant/60"
        >
          <div>
            <h2 className="text-base font-extrabold text-ink">
              {b.widgetSettingsTitle} — {title}
            </h2>
            <p className="text-xs text-ink-muted">{b.widgetSettingsSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-highest text-ink-muted hover:text-ink flex items-center justify-center"
            aria-label={b.cancelEdit}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        <div data-dialog-body className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Live Interactive Preview Box */}
          <div className="rounded-2xl bg-surface-container-lowest/75 border border-outline-variant/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-primary">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {b.widgetLivePreview}
              </span>
              <span
                dir="ltr"
                className="rounded-full bg-primary/12 text-primary px-2.5 py-0.5 text-[10px] font-black tabular-nums"
              >
                {formatMessage(b.gridSizeBadge, {
                  cols: currentCols,
                  rows: currentRows,
                })}
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <DashboardWidget
                id={item.id}
                data={boardData}
                settings={draftSettings}
                onUpdateSettings={patchDraft}
              />
            </div>
          </div>

          {/* 1. Material You Color Theme */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-ink block">
              {b.widgetThemeLabel}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {themes.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => patchDraft({ theme: th.id })}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                    currentTheme === th.id
                      ? "border-primary bg-primary/12 text-primary shadow-2xs"
                      : "border-outline-variant/60 bg-surface-container-lowest text-ink hover:border-primary/40"
                  }`}
                >
                  <span
                    data-keep-round="true"
                    className={`w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 ${th.swatch}`}
                  />
                  <span className="truncate">{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Surface Style & Android Grid Dimensions (Columns × Rows) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-ink block">
                {b.widgetSurfaceLabel}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {surfaces.map((sf) => (
                  <button
                    key={sf.id}
                    type="button"
                    onClick={() => patchDraft({ surface: sf.id })}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
                      currentSurface === sf.id
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest text-ink hover:border-primary/40"
                    }`}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-ink block">
                {b.gridColsLabel}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allowedColOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setDraftSize(colsToSize(c, catalogueEntry?.sizes))
                    }
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all tabular-nums ${
                      currentCols === c
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest text-ink hover:border-primary/40"
                    }`}
                  >
                    {formatMessage(b.gridColsOption, { n: c })}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-ink block">
                {b.gridRowsLabel}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allowedRowOptions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => patchDraft({ rowSpan: r })}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all tabular-nums ${
                      currentRows === r
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest text-ink hover:border-primary/40"
                    }`}
                  >
                    {formatMessage(b.gridRowsOption, { n: r })}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-ink-muted">
            {formatMessage(b.gridBoundsHint, {
              minCols: bounds.minCols,
              maxCols: bounds.maxCols,
              minRows: bounds.minRows,
              maxRows: bounds.maxRows,
            })}
          </p>

          {/* 3. Widget-Specific Controls */}
          {item.id === "clock_local" ? (
            <div className="space-y-4 pt-3 border-t border-outline-variant/50">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.clockStyleLabel}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ["scalloped", b.clockStyles.scalloped],
                      ["analog", b.clockStyles.analog],
                      ["digital_stacked", b.clockStyles.digital_stacked],
                      ["digital", b.clockStyles.digital],
                    ] as const
                  ).map(([styleId, label]) => {
                    const active =
                      (draftSettings.clockStyle ?? "scalloped") === styleId;
                    return (
                      <button
                        key={styleId}
                        type="button"
                        onClick={() => patchDraft({ clockStyle: styleId })}
                        className={`rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                          active
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.clockFormatLabel}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => patchDraft({ format24h: false })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold border ${
                        draftSettings.format24h !== true
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {b.clock12h}
                    </button>
                    <button
                      type="button"
                      onClick={() => patchDraft({ format24h: true })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold border ${
                        draftSettings.format24h === true
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {b.clock24h}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.clockTimezoneLabel}
                  </label>
                  <Select
                    value={
                      typeof draftSettings.timezoneCity === "string"
                        ? draftSettings.timezoneCity
                        : "manama"
                    }
                    onChange={(e) =>
                      patchDraft({ timezoneCity: e.target.value })
                    }
                    aria-label={b.clockTimezoneLabel}
                  >
                    {WORLD_CLOCK_CITIES.map((c) => {
                      const cityName =
                        (b.cities as Record<string, string>)[c.cityKey] ??
                        c.cityKey;
                      const countryName =
                        (b.countries as Record<string, string>)[
                          c.countryCode
                        ] ?? c.countryCode;
                      return (
                        <option key={c.key} value={c.key}>
                          {c.flag} {cityName}, {countryName} ({formatMessage(b.utcOffsetBadge, { offset: c.utcOffsetLabel })})
                        </option>
                      );
                    })}
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showSeconds !== false}
                    onChange={(e) =>
                      patchDraft({ showSeconds: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.clockShowSeconds}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showDate !== false}
                    onChange={(e) => patchDraft({ showDate: e.target.checked })}
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.clockShowDate}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showNumbers !== false}
                    onChange={(e) =>
                      patchDraft({ showNumbers: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.clockShowNumbers}
                </label>
              </div>
            </div>
          ) : null}

          {item.id === "clock_world" ? (
            <div className="space-y-4 pt-3 border-t border-outline-variant/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.clockFormatLabel}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => patchDraft({ format24h: false })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold border ${
                        draftSettings.format24h !== true
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {b.clock12h}
                    </button>
                    <button
                      type="button"
                      onClick={() => patchDraft({ format24h: true })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold border ${
                        draftSettings.format24h === true
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {b.clock24h}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.worldClockLayoutLabel}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => patchDraft({ worldLayout: "grid" })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold border ${
                        (draftSettings.worldLayout ?? "grid") === "grid"
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {b.worldClockLayoutGrid}
                    </button>
                    <button
                      type="button"
                      onClick={() => patchDraft({ worldLayout: "list" })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold border ${
                        draftSettings.worldLayout === "list"
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {b.worldClockLayoutList}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.worldClockCountriesLabel}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {WORLD_CLOCK_CITIES.map((c) => {
                    const checked = selectedWorldZones.has(c.key);
                    const cityName =
                      (b.cities as Record<string, string>)[c.cityKey] ??
                      c.cityKey;
                    const countryName =
                      (b.countries as Record<string, string>)[c.countryCode] ??
                      c.countryCode;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggleWorldZone(c.key)}
                        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-xs border transition-all ${
                          checked
                            ? "border-primary bg-primary/12 text-primary font-bold"
                            : "border-outline-variant/50 bg-surface-container-lowest text-ink hover:border-primary/40"
                        }`}
                      >
                        <span className="truncate">
                          {c.flag} {cityName} ({countryName})
                        </span>
                        <span
                          dir="ltr"
                          className="text-[10px] font-extrabold opacity-80 shrink-0"
                        >
                          {formatMessage(b.utcOffsetBadge, {
                            offset: c.utcOffsetLabel,
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showUtc !== false}
                    onChange={(e) => patchDraft({ showUtc: e.target.checked })}
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.worldClockShowUtc}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showRelative !== false}
                    onChange={(e) =>
                      patchDraft({ showRelative: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.worldClockShowRelative}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showFlags !== false}
                    onChange={(e) =>
                      patchDraft({ showFlags: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.worldClockShowFlags}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showSeconds === true}
                    onChange={(e) =>
                      patchDraft({ showSeconds: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.clockShowSeconds}
                </label>
              </div>
            </div>
          ) : null}

          {item.id === "weather_local" ? (
            <div className="space-y-4 pt-3 border-t border-outline-variant/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.weatherCountryLabel}
                  </label>
                  <Select
                    value={currentWeatherCountry}
                    onChange={(e) => {
                      const nextCountry = e.target.value;
                      const firstCity =
                        WEATHER_CITIES_BY_COUNTRY[nextCountry]?.[0] ?? "manama";
                      patchDraft({
                        country: nextCountry,
                        city: firstCity,
                      });
                    }}
                    aria-label={b.weatherCountryLabel}
                  >
                    {Object.keys(WEATHER_CITIES_BY_COUNTRY).map((cc) => (
                      <option key={cc} value={cc}>
                        {(b.countries as Record<string, string>)[cc] ?? cc}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.weatherCityLabel}
                  </label>
                  <Select
                    value={currentWeatherCity}
                    onChange={(e) => patchDraft({ city: e.target.value })}
                    aria-label={b.weatherCityLabel}
                  >
                    {citiesForWeatherCountry.map((cityKey) => (
                      <option key={cityKey} value={cityKey}>
                        {(b.cities as Record<string, string>)[cityKey] ??
                          cityKey}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.weatherUnitLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => patchDraft({ unit: "C" })}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold border ${
                      (draftSettings.unit ?? "C") === "C"
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                    }`}
                  >
                    {b.weatherUnitC}
                  </button>
                  <button
                    type="button"
                    onClick={() => patchDraft({ unit: "F" })}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold border ${
                      draftSettings.unit === "F"
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                    }`}
                  >
                    {b.weatherUnitF}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showForecast !== false}
                    onChange={(e) =>
                      patchDraft({ showForecast: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.weatherShowForecast}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftSettings.showMetrics !== false}
                    onChange={(e) =>
                      patchDraft({ showMetrics: e.target.checked })
                    }
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  {b.weatherShowMetrics}
                </label>
              </div>
            </div>
          ) : null}

          {item.id === "welcome_profile" ? (
            <div className="flex flex-wrap gap-4 pt-3 border-t border-outline-variant/50">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftSettings.showHijri !== false}
                  onChange={(e) => patchDraft({ showHijri: e.target.checked })}
                  className="rounded border-outline-variant text-primary focus:ring-primary"
                />
                {b.profileShowHijri}
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftSettings.showFocus !== false}
                  onChange={(e) => patchDraft({ showFocus: e.target.checked })}
                  className="rounded border-outline-variant text-primary focus:ring-primary"
                />
                {b.profileShowFocus}
              </label>
            </div>
          ) : null}

          {item.id === "calendar_mini" ? (
            <div className="flex flex-wrap gap-4 pt-3 border-t border-outline-variant/50">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftSettings.showHijri !== false}
                  onChange={(e) => patchDraft({ showHijri: e.target.checked })}
                  className="rounded border-outline-variant text-primary focus:ring-primary"
                />
                {b.calendarShowHijri}
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftSettings.showEvents !== false}
                  onChange={(e) => patchDraft({ showEvents: e.target.checked })}
                  className="rounded border-outline-variant text-primary focus:ring-primary"
                />
                {b.calendarShowEvents}
              </label>
            </div>
          ) : null}

          {item.id === "scratchpad_notes" ? (
            <div className="space-y-2 pt-3 border-t border-outline-variant/50">
              <label className="text-xs font-extrabold text-ink block">
                {b.scratchpadTintLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["warm", b.scratchpadTints.warm],
                    ["mint", b.scratchpadTints.mint],
                    ["sky", b.scratchpadTints.sky],
                    ["violet", b.scratchpadTints.violet],
                    ["neutral", b.scratchpadTints.neutral],
                  ] as const
                ).map(([tintId, label]) => (
                  <button
                    key={tintId}
                    type="button"
                    onClick={() => patchDraft({ noteTint: tintId })}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold border ${
                      (draftSettings.noteTint ?? "warm") === tintId
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {item.id === "focus_pomodoro" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-outline-variant/50">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.pomodoroFocusMinutes}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[15, 25, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => patchDraft({ focusMinutes: m })}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${
                        (draftSettings.focusMinutes ?? 25) === m
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {formatMessage(b.pomodoroMinutesOption, { n: m })}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.pomodoroBreakMinutes}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 15].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => patchDraft({ breakMinutes: m })}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${
                        (draftSettings.breakMinutes ?? 5) === m
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                      }`}
                    >
                      {formatMessage(b.pomodoroMinutesOption, { n: m })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {item.id === "quick_calculator" ? (
            <div className="space-y-2 pt-3 border-t border-outline-variant/50">
              <label className="text-xs font-extrabold text-ink block">
                {b.calcVatRateLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => patchDraft({ vatRate: rate })}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold border tabular-nums ${
                      (draftSettings.vatRate ?? 10) === rate
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {item.id === "currency_rates" ? (
            <div className="space-y-4 pt-3 border-t border-outline-variant/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.currencyBaseLabel}
                  </label>
                  <Select
                    value={
                      typeof draftSettings.baseCurrency === "string"
                        ? draftSettings.baseCurrency
                        : "BHD"
                    }
                    onChange={(e) =>
                      patchDraft({ baseCurrency: e.target.value })
                    }
                    aria-label={b.currencyBaseLabel}
                  >
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-ink block">
                    {b.currencyAmountLabel}
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={
                      typeof draftSettings.defaultAmount === "number"
                        ? draftSettings.defaultAmount
                        : 100
                    }
                    onChange={(e) =>
                      patchDraft({
                        defaultAmount: Number.parseFloat(e.target.value) || 100,
                      })
                    }
                    aria-label={b.currencyAmountLabel}
                    className="w-full h-10 rounded-xl bg-surface-container-lowest border border-outline-variant px-3 text-xs font-bold text-ink"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.currencyTargetsLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_CURRENCIES.map((code) => {
                    const checked = selectedCurrencyTargets.has(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleCurrencyTarget(code)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${
                          checked
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant/60 bg-surface-container-lowest text-ink"
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {item.id === "countdown_milestone" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-outline-variant/50">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.countdownTitleLabel}
                </label>
                <input
                  type="text"
                  value={
                    typeof draftSettings.milestoneTitle === "string"
                      ? draftSettings.milestoneTitle
                      : b.countdownDefaultTitle
                  }
                  onChange={(e) =>
                    patchDraft({ milestoneTitle: e.target.value })
                  }
                  aria-label={b.countdownTitleLabel}
                  className="w-full h-10 rounded-xl bg-surface-container-lowest border border-outline-variant px-3 text-xs font-bold text-ink"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.countdownDateLabel}
                </label>
                <input
                  type="date"
                  dir="ltr"
                  value={
                    typeof draftSettings.targetDate === "string"
                      ? draftSettings.targetDate
                      : ""
                  }
                  onChange={(e) => patchDraft({ targetDate: e.target.value })}
                  aria-label={b.countdownDateLabel}
                  className="w-full h-10 rounded-xl bg-surface-container-lowest border border-outline-variant px-3 text-xs font-bold text-ink"
                />
              </div>
            </div>
          ) : null}

          {item.id === "sticky_quote" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-outline-variant/50">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.quoteCustomLabel}
                </label>
                <input
                  type="text"
                  value={
                    typeof draftSettings.customQuote === "string"
                      ? draftSettings.customQuote
                      : ""
                  }
                  onChange={(e) => patchDraft({ customQuote: e.target.value })}
                  placeholder={b.quoteCustomPlaceholder}
                  aria-label={b.quoteCustomLabel}
                  className="w-full h-10 rounded-xl bg-surface-container-lowest border border-outline-variant px-3 text-xs text-ink"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-ink block">
                  {b.quoteAuthorLabel}
                </label>
                <input
                  type="text"
                  value={
                    typeof draftSettings.customAuthor === "string"
                      ? draftSettings.customAuthor
                      : ""
                  }
                  onChange={(e) => patchDraft({ customAuthor: e.target.value })}
                  aria-label={b.quoteAuthorLabel}
                  className="w-full h-10 rounded-xl bg-surface-container-lowest border border-outline-variant px-3 text-xs text-ink"
                />
              </div>
            </div>
          ) : null}
        </div>

        <footer
          role="presentation"
          data-modal-footer
          className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/60 bg-surface-container-low"
        >
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {b.cancelEdit}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onApply(draftSize, draftSettings)}
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {b.applyWidgetSettings}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
