"use client";

import type { TaskChoices, TaskRow } from "@platform/database";
import { TasksView, type TaskFiltersState } from "./TasksView";
import { PageHeader } from "../layout/PageHeader";

export function TasksPage(props: { rows: TaskRow[]; choices: TaskChoices; filters: TaskFiltersState; canAssign: boolean; selfId: string; today: string }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader />
      <TasksView {...props} />
    </div>
  );
}
