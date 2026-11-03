// Tasks and projects: statuses, priorities and how due dates group. Runtime-free.

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
/** Statuses still to be worked on. */
export const OPEN_TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
];
/** The columns of the board, in order (cancelled tasks are listed, not boarded). */
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

/** Records a task can be about, with the page that opens them. */
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

/** Where a task falls by its due date, against today's date ("YYYY-MM-DD"). */
export function dueBucket(dueDate: string | null, today: string): DueBucket {
  if (!dueDate) return "none";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  const week = new Date(`${today}T00:00:00Z`);
  week.setUTCDate(week.getUTCDate() + 7);
  return dueDate <= week.toISOString().slice(0, 10) ? "week" : "later";
}

/** Share of a project's tasks that are done (cancelled tasks do not count). */
export function projectProgress(counts: Partial<Record<TaskStatus, number>>) {
  const total =
    (counts.todo ?? 0) +
    (counts.in_progress ?? 0) +
    (counts.review ?? 0) +
    (counts.done ?? 0);
  return total ? Math.round(((counts.done ?? 0) / total) * 100) : 0;
}
