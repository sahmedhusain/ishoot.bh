"use client";

import type { TaskChoices, TaskRow } from "@platform/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { TasksView, type TaskFiltersState } from "./TasksView";

export function TasksPage(props: { rows: TaskRow[]; choices: TaskChoices; filters: TaskFiltersState; canAssign: boolean; selfId: string; today: string }) {
  const { t } = useAdminLocale();
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t.tasks.title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{t.tasks.subtitle}</p>
      </div>
      <TasksView {...props} />
    </div>
  );
}
