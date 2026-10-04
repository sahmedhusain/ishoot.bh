"use client";

import { UserX } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Shown wherever self-service HR needs an employee record the user does not have. */
export function NoEmployeeProfile() {
  const { t } = useAdminLocale();
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 p-4">
      <UserX className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.hrSelfService.noProfileTitle}</p>
        <p className="text-xs text-slate-500 mt-1">{t.hrSelfService.noProfileBody}</p>
      </div>
    </div>
  );
}
