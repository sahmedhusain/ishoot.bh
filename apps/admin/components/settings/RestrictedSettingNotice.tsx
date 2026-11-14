"use client";

import Link from "next/link";
import { ShieldAlert, Sliders } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function RestrictedSettingNotice() {
  const { t } = useAdminLocale();
  const banner = t.settingsGovernance;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">
              {banner.restrictedTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {banner.restrictedDescription}
            </p>
            <div className="pt-2">
              <Link
                href={ROUTES.settings.preferences}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Sliders className="h-4 w-4" />
                {banner.goToPreferences}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
