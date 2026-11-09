"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ListTodo, MessageSquare, Plus, Search } from "lucide-react";
import { Button, Card, Input, Select, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { BOARD_COLUMNS, TASK_STATUSES, dueBucket, type DueBucket } from "@platform/database/constants/tasks";
import type { TaskChoices, TaskRow } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { moveTaskAction } from "../../app/actions/tasks";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { PriorityPill, TaskLink, TaskStatusPill } from "./TaskBits";
import { TaskForm, emptyTask } from "./TaskForm";

export interface TaskFiltersState {
  view: "mine" | "board" | "all";
  q: string;
  project: string;
  assignee: string;
  department: string;
}

const BUCKETS: DueBucket[] = ["overdue", "today", "week", "later", "none"];

export function TasksView({ rows, choices, filters, canAssign, selfId, today, projectId }: { rows: TaskRow[]; choices: TaskChoices; filters: TaskFiltersState; canAssign: boolean; selfId: string; today: string; projectId?: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.tasks;
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [search, setSearch] = React.useState(filters.q);
  const [error, setError] = React.useState("");
  const [dragging, setDragging] = React.useState<string | null>(null);
  const base = projectId ? ROUTES.tasks.project(projectId) : ROUTES.tasks.list;
  const href = (next: Partial<TaskFiltersState>) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.view !== (projectId ? "board" : "mine")) params.set("view", merged.view);
    if (merged.q) params.set("q", merged.q);
    if (merged.project && !projectId) params.set("project", merged.project);
    if (merged.assignee) params.set("assignee", merged.assignee);
    if (merged.department) params.set("department", merged.department);
    return params.toString() ? `${base}?${params}` : base;
  };
  const move = async (id: string, status: string) => {
    setError("");
    try {
      await moveTaskAction(id, status);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    }
  };

  const card = (task: TaskRow, board = false) => (
    <div
      key={task.id}
      draggable={board}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        setDragging(task.id);
      }}
      onDragEnd={() => setDragging(null)}
      className={`rounded-xl border border-outline-variant bg-surface-raised dark:bg-surface p-3 space-y-2 ${board ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === task.id ? "opacity-50" : ""}`}
      data-testid={`task-${task.number}`}
    >
      <div className="flex items-start gap-2">
        {!board && (
          <input type="checkbox" className="mt-1 h-4 w-4 accent-accent" checked={task.status === "done"} aria-label={formatMessage(copy.moveTo, { status: copy.statuses.done })} onChange={(e) => void move(task.id, e.target.checked ? "done" : "todo")} />
        )}
        <Link href={ROUTES.tasks.detail(task.id)} className={`flex-1 text-sm font-medium hover:text-accent ${task.status === "done" ? "line-through text-ink-muted" : "text-ink"}`}>{task.title}</Link>
        <PriorityPill priority={task.priority} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="font-mono" dir="ltr">{task.number}</span>
        {!board && <TaskStatusPill status={task.status} />}
        {task.project && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} aria-hidden="true" /><bdi dir="auto">{task.project.name}</bdi></span>}
        {task.due_date && <span className={`inline-flex items-center gap-1 ${task.status !== "done" && task.due_date < today ? "text-rose-600 font-semibold" : ""}`}><CalendarClock className="w-3 h-3" aria-hidden="true" />{formatDate(task.due_date, locale)}</span>}
        {task.assignee_id !== selfId && <span>{task.assignee || copy.unassigned}</span>}
        {task.comments > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" aria-hidden="true" />{task.comments}</span>}
        {task.link && <TaskLink type={task.link.type} id={task.link.id} />}
      </div>
      {board && (
        <Select aria-label={formatMessage(copy.moveTo, { status: "" }).trim()} value={task.status} onChange={(e) => void move(task.id, e.target.value)} className="h-8 rounded-lg text-xs">
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{copy.statuses[s]}</option>)}
        </Select>
      )}
    </div>
  );

  const open = rows.filter((r) => r.status !== "done" && r.status !== "cancelled");
  const finished = rows.filter((r) => r.status === "done");

  return (
    <div className="space-y-5" data-testid="tasks-view">
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
        <div className="inline-flex rounded-full border border-outline-variant p-1 text-xs font-semibold" role="tablist">
          {(["mine", "board", "all"] as const).map((v) => (
            <Link key={v} href={href({ view: v })} role="tab" aria-selected={filters.view === v} className={`rounded-full px-3 py-1.5 ${filters.view === v ? "bg-primary text-primary-foreground" : "text-ink-muted hover:text-ink"}`} tabIndex={filters.view === v ? 0 : -1}>{copy.views[v]}</Link>
          ))}
        </div>
        <form role="search" className="relative flex-1" onSubmit={(e) => { e.preventDefault(); router.push(href({ q: search.trim() })); }}>
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
          <Input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </form>
        {!projectId && (
          <Select aria-label={copy.allProjects} value={filters.project} onChange={(e) => router.push(href({ project: e.target.value }))} className="rounded-xl lg:w-44">
            <option value="">{copy.allProjects}</option>
            {choices.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
        {filters.view !== "mine" && canAssign && (
          <Select aria-label={copy.allPeople} value={filters.assignee} onChange={(e) => router.push(href({ assignee: e.target.value }))} className="rounded-xl lg:w-44">
            <option value="">{copy.allPeople}</option>
            {choices.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
        {filters.view !== "mine" && choices.departments.length > 0 && (
          <Select aria-label={copy.allDepartments} value={filters.department} onChange={(e) => router.push(href({ department: e.target.value }))} className="rounded-xl lg:w-44">
            <option value="">{copy.allDepartments}</option>
            {choices.departments.map((d) => <option key={d.id} value={d.id}>{locale === "ar" ? d.name_ar : d.name_en}</option>)}
          </Select>
        )}
        {!adding && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5 shrink-0" onClick={() => setAdding(true)} data-testid="task-new">
            <Plus className="w-4 h-4" />
            {copy.new}
          </Button>
        )}
      </div>
      {adding && (
        <Card className="p-5">
          <TaskForm initial={emptyTask({ assigneeId: selfId, projectId: projectId ?? filters.project })} choices={choices} canAssign={canAssign} selfId={selfId} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); router.refresh(); }} />
        </Card>
      )}
      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <ListTodo className="w-8 h-8 text-ink-muted" aria-hidden="true" />
          <p className="text-sm text-ink-muted">{copy.empty}</p>
        </Card>
      ) : filters.view === "board" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-testid="task-board">
          {BOARD_COLUMNS.map((status) => {
            const column = rows.filter((r) => r.status === status);
            return (
              <section
                key={status}
                aria-label={copy.statuses[status]}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  const task = rows.find((r) => r.id === id);
                  if (task && task.status !== status) void move(id, status);
                }}
                className="rounded-2xl bg-ink/[0.03] p-3 space-y-2 min-h-32"
                data-testid={`column-${status}`}
               data-page-section>
                <h2 className="flex items-center justify-between text-xs font-bold text-ink">
                  {copy.statuses[status]}
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] tabular-nums">{column.length}</span>
                </h2>
                {column.map((task) => card(task, true))}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {BUCKETS.map((bucket) => {
            const tasks = open.filter((r) => dueBucket(r.due_date, today) === bucket);
            if (!tasks.length) return null;
            return (
              <section key={bucket} className="space-y-2" data-testid={`bucket-${bucket}`} data-page-section>
                <h2 className={`text-xs font-bold uppercase tracking-wide ${bucket === "overdue" ? "text-rose-600" : "text-ink-muted"}`}>{copy.buckets[bucket]} · {tasks.length}</h2>
                {tasks.map((task) => card(task))}
              </section>
            );
          })}
          {finished.length > 0 && (
            <section className="space-y-2" data-testid="bucket-done" data-page-section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{copy.statuses.done} · {finished.length}</h2>
              {finished.map((task) => card(task))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
