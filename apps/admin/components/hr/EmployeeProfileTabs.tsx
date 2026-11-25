"use client";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

type EmployeeTabKey = "overview" | "hr" | "compensation" | "assets";

interface EmployeeProfileTabsProps {
  overview: React.ReactNode;
  hr: React.ReactNode;
  compensation?: React.ReactNode;
  assets?: React.ReactNode;
}

/**
 * Splits secondary employee profile cards into cohesive Material Design 3 tabs
 * so the main employee record stays scannable while keeping all panels mounted.
 */
export function EmployeeProfileTabs({
  overview,
  hr,
  compensation,
  assets,
}: EmployeeProfileTabsProps) {
  const { t } = useAdminLocale();
  const tabLabels = t.employeeDetail.tabs;

  const tabs = React.useMemo(
    () =>
      (
        [
          { key: "overview" as const, label: tabLabels.overview, content: overview },
          { key: "hr" as const, label: tabLabels.hr, content: hr },
          ...(compensation
            ? [{ key: "compensation" as const, label: tabLabels.compensation, content: compensation }]
            : []),
          ...(assets
            ? [{ key: "assets" as const, label: tabLabels.assets, content: assets }]
            : []),
        ] satisfies { key: EmployeeTabKey; label: string; content: React.ReactNode }[]
      ),
    [tabLabels.overview, tabLabels.hr, tabLabels.compensation, tabLabels.assets, overview, hr, compensation, assets],
  );

  const [active, setActive] = React.useState<EmployeeTabKey>("overview");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        data-tab-variant="pills"
        aria-label={t.employeeDetail.general}
        className="flex flex-wrap gap-2 border-b border-outline-variant pb-3"
      >
        {tabs.map((item) => {
          const isSelected = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`employee-tab-${item.key}`}
              aria-selected={isSelected}
              aria-controls={`employee-panel-${item.key}`}
              onClick={() => setActive(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "bg-secondary-container text-on-secondary-container shadow-xs"
                  : "text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tabs.map((item) => {
        const isSelected = active === item.key;
        return (
          <div
            key={item.key}
            role="tabpanel"
            id={`employee-panel-${item.key}`}
            aria-labelledby={`employee-tab-${item.key}`}
            hidden={!isSelected}
            className="space-y-6"
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
