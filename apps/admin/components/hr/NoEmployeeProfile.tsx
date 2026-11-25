"use client";

import { UserX } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NoEmployeeProfile() {
  const { t } = useAdminLocale();
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-4">
      <UserX className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">{t.hrSelfService.noProfileTitle}</p>
        <p className="text-xs text-ink-muted mt-1">{t.hrSelfService.noProfileBody}</p>
      </div>
    </div>
  );
}
