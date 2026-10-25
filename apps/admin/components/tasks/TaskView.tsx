"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Button, Card, Select, Textarea, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { TASK_STATUSES } from "@platform/database/constants/tasks";
import type { TaskChoices, TaskRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { addTaskCommentAction, moveTaskAction } from "../../app/actions/tasks";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { PriorityPill, TaskLink, TaskStatusPill } from "./TaskBits";
import { TaskForm } from "./TaskForm";

/** One task: what and for whom, its status, editing, and the conversation about it. */
export function TaskView({ task, choices, canAssign, selfId }: { task: TaskRecord; choices: TaskChoices; canAssign: boolean; selfId: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.tasks;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const department = choices.departments.find((d) => d.id === task.department_id);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await work();
      router.refresh();
      return true;
    } catch (err) {
      setError(errorMessage(err, t));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      <div className="space-y-2">
        <Link href={ROUTES.tasks.list} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
          {copy.detail.back}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="font-mono" dir="ltr">{task.number}</span>
          <TaskStatusPill status={task.status} />
          <PriorityPill priority={task.priority} />
          {task.project && <Link href={ROUTES.tasks.project(task.project.id)} className="inline-flex items-center gap-1 hover:text-accent"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} aria-hidden="true" />{task.project.name}</Link>}
          {task.due_date && <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" aria-hidden="true" />{formatDate(task.due_date, locale)}</span>}
          <span>{task.assignee || copy.unassigned}</span>
          {department && <span>{locale === "ar" ? department.name_ar : department.name_en}</span>}
          {task.created_by && <span>{formatMessage(copy.detail.createdBy, { name: task.created_by })}</span>}
          {task.completed_at && <span>{formatMessage(copy.detail.completed, { time: formatDate(task.completed_at, locale, "time") })}</span>}
          {task.link_type && <TaskLink type={task.link_type} id={task.link_id} />}
        </div>
      </div>
      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}

      <Card className="p-5 space-y-4">
        {editing ? (
          <TaskForm
            initial={{ id: task.id, title: task.title, description: task.description, projectId: task.project_id, status: task.status, priority: task.priority, assigneeId: task.assignee_id, departmentId: task.department_id, startDate: task.start_date ?? "", dueDate: task.due_date ?? "", linkType: task.link_type || undefined, linkId: task.link_id || undefined }}
            choices={choices}
            canAssign={canAssign}
            selfId={selfId}
            onCancel={() => setEditing(false)}
            onSaved={() => { setEditing(false); router.refresh(); }}
          />
        ) : (
          <>
            {task.description ? <p className="text-sm text-ink whitespace-pre-line">{task.description}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label={copy.form.status} name="taskStatusQuick" value={task.status} disabled={busy} onChange={(e) => void run(() => moveTaskAction(task.id, e.target.value))} className="h-9 w-44 rounded-lg">
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{copy.statuses[s]}</option>)}
              </Select>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(true)} data-testid="task-edit">{copy.detail.edit}</Button>
            </div>
          </>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-bold text-ink">{copy.detail.comments}</h2>
        {task.comments.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.detail.noComments}</p>
        ) : (
          <ol className="space-y-3" data-testid="task-comments">
            {task.comments.map((c) => (
              <li key={c.id} className="rounded-xl bg-ink/[0.03] p-3 text-sm">
                <p className="text-xs text-ink-muted mb-1"><span className="font-semibold text-ink">{c.author}</span> · {formatDate(c.at, locale, "time")}</p>
                <p className="whitespace-pre-line">{c.body}</p>
              </li>
            ))}
          </ol>
        )}
        <Textarea aria-label={copy.detail.comment} placeholder={copy.detail.comment} name="taskComment" rows={2} maxLength={4000} value={comment} onChange={(e) => setComment(e.target.value)} className="rounded-lg" />
        <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy || !comment.trim()} onClick={async () => { if (await run(() => addTaskCommentAction(task.id, comment))) setComment(""); }} data-testid="task-comment-send">{copy.detail.send}</Button>
      </Card>
    </div>
  );
}
