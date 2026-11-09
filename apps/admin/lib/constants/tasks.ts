
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const OPEN_TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
];
export const BOARD_COLUMNS: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
];

export const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PROJECT_STATUSES = [
  "active",
  "on_hold",
  "done",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_LINK_TYPES = [
  "order",
  "deal",
  "request",
  "shipment",
  "purchase_order",
  "contact",
] as const;
export type TaskLinkType = (typeof TASK_LINK_TYPES)[number];

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";

export function dueBucket(dueDate: string | null, today: string): DueBucket {
  if (!dueDate) return "none";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  const week = new Date(`${today}T00:00:00Z`);
  week.setUTCDate(week.getUTCDate() + 7);
  return dueDate <= week.toISOString().slice(0, 10) ? "week" : "later";
}

export function projectProgress(counts: Partial<Record<TaskStatus, number>>) {
  const total =
    (counts.todo ?? 0) +
    (counts.in_progress ?? 0) +
    (counts.review ?? 0) +
    (counts.done ?? 0);
  return total ? Math.round(((counts.done ?? 0) / total) * 100) : 0;
}
