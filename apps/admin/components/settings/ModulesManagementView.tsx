"use client";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { Card } from "@platform/ui";
import { toggleFeatureAction } from "../../app/actions/settings";
import type { FeatureToggle } from "@platform/database/types";
import { ShieldAlert, ToggleLeft, ToggleRight } from "lucide-react";

interface ModulesManagementViewProps {
  initialToggles: FeatureToggle[];
}

export function ModulesManagementView({ initialToggles }: ModulesManagementViewProps) {
  const { t, isRTL } = useAdminLocale();
  const [toggles, setToggles] = React.useState(initialToggles);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handleToggle = async (moduleKey: string, currentStatus: boolean) => {
    setLoadingId(moduleKey);
    try {
      const result = await toggleFeatureAction(moduleKey, !currentStatus);
      if (result.success && result.feature) {
        setToggles((prev) =>
          prev.map((t) => (t.moduleKey === moduleKey ? result.feature : t))
        );
      }
    } catch (error) {
      console.error("Failed to toggle module:", error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.modulesView.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {t.modulesView.subtitle}
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-amber-700 dark:text-amber-400">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">{t.modulesView.superAdminWarning}</p>
          <p className="text-xs mt-1 opacity-90">
            {t.modulesView.superAdminWarningDesc}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {toggles.map((toggle) => (
          <Card
            key={toggle.id}
            className={`p-5 transition-all ${
              toggle.isEnabled
                ? "bg-white dark:bg-surface-raised border-slate-200 dark:border-accent/30"
                : "bg-slate-50 dark:bg-surface-sunken border-slate-200 dark:border-white/10 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {isRTL ? toggle.nameAr : toggle.nameEn}
                </h3>
                <p className="text-xs text-slate-500 dark:text-ink-muted  mt-1">
                  {t.copy.idLabel}{toggle.moduleKey}
                </p>
                {toggle.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    {toggle.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleToggle(toggle.moduleKey, toggle.isEnabled)}
                disabled={loadingId === toggle.moduleKey}
                className={`p-1 -m-1 transition-colors ${
                  toggle.isEnabled
                    ? "text-accent hover:text-primary"
                    : "text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500"
                }`}
              >
                {loadingId === toggle.moduleKey ? (
                  <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : toggle.isEnabled ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
