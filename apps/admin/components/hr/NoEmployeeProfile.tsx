"use client";

import { UserX } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Shown wherever self-service HR needs an employee record the user does not have. */
export function NoEmployeeProfile() {
  const { t } = useAdminLocale();
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-dashed border-outline-variant dark:border-white/15 bg-surface-raised dark:bg-white/5 p-4">
      <UserX className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">{t.hrSelfService.noProfileTitle}</p>
        <p className="text-xs text-ink-muted mt-1">{t.hrSelfService.noProfileBody}</p>
      </div>
    </div>
  );
}
