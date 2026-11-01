"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderKanban, Plus } from "lucide-react";
import { Button, Card, Input, Select, Textarea, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { PROJECT_STATUSES } from "@platform/database/constants/tasks";
import type { ProjectInput, ProjectRow, TaskChoices, TaskRow } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { saveProjectAction } from "../../app/actions/tasks";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { TasksView, type TaskFiltersState } from "./TasksView";
import { PageHeader } from "../layout/PageHeader";

const toInput = (p: ProjectRow): ProjectInput => ({ id: p.id, name: p.name, description: p.description, status: p.status, departmentId: p.department_id, ownerId: p.owner_id, color: p.color, startDate: p.start_date ?? "", dueDate: p.due_date ?? "" });

function ProjectForm({ initial, choices, onDone, onCancel }: { initial: ProjectInput; choices: TaskChoices; onDone: (id: string) => void; onCancel: () => void }) {
  const { t, locale } = useAdminLocale();
  const copy = t.tasks.projects;
  const [form, setForm] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      onDone((await saveProjectAction(form)).id);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid sm:grid-cols-2 gap-4" data-testid="project-form">
      <Field label={copy.name}>{(id) => <Input id={id} name="projectName" maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.status}>
        {(id) => (
          <Select id={id} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg">
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{copy.statuses[s]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.description} wide>{(id) => <Textarea id={id} rows={2} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.owner}>
        {(id) => (
          <Select id={id} name="projectOwner" value={form.ownerId ?? ""} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className="rounded-lg">
            <option value="">{copy.noOwner}</option>
            {choices.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.department}>
        {(id) => (
          <Select id={id} value={form.departmentId ?? ""} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="rounded-lg">
            <option value="">{t.tasks.form.noDepartment}</option>
            {choices.departments.map((d) => <option key={d.id} value={d.id}>{locale === "ar" ? d.name_ar : d.name_en}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.startDate}>{(id) => <Input id={id} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.dueDate}>{(id) => <Input id={id} name="projectDue" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.color}>{(id) => <input id={id} type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })} className="h-10 w-16 rounded-lg border border-outline-variant bg-transparent" />}</Field>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy || !form.name.trim()} onClick={() => void save()} data-testid="project-save">{copy.save}</Button>
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>{copy.cancel}</Button>
      </div>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

/** Tasks → projects: every project with how far along it is. */
export function ProjectsView({ projects, choices, canManage }: { projects: ProjectRow[]; choices: TaskChoices; canManage: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.tasks.projects;
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={canManage && !adding && (
          <Button type="button" size="sm" variant="primary" className="rounded-full gap-1.5" onClick={() => setAdding(true)} data-testid="project-new">
            <Plus className="w-4 h-4" />
            {copy.new}
          </Button>
        )}
      />
      {adding && (
        <Card className="p-5">
          <ProjectForm initial={{ name: "", description: "", status: "active", departmentId: "", ownerId: "", color: "#4F46E5", startDate: "", dueDate: "" }} choices={choices} onCancel={() => setAdding(false)} onDone={(id) => router.push(ROUTES.tasks.project(id))} />
        </Card>
      )}
      {projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <FolderKanban className="w-8 h-8 text-ink-muted" aria-hidden="true" />
          <p className="text-sm text-ink-muted">{copy.empty}</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="projects-list">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={ROUTES.tasks.project(p.id)} className="block rounded-2xl border border-outline-variant bg-surface-raised dark:bg-surface p-4 space-y-3 hover:border-accent">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span className="ms-auto text-xs text-ink-muted">{(copy.statuses as Record<string, string>)[p.status]}</span>
                </div>
                <Progress value={p.progress} />
                <div className="flex flex-wrap gap-x-3 text-xs text-ink-muted">
                  <span>{formatMessage(copy.progress, { progress: p.progress })}</span>
                  <span>{formatMessage(copy.openTasks, { count: p.open })}</span>
                  {p.owner && <span>{p.owner}</span>}
                  {p.due_date && <span>{formatDate(p.due_date, locale)}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One project: its details and its tasks on a board. */
export function ProjectView({ project, rows, choices, filters, canAssign, selfId, today }: { project: ProjectRow; rows: TaskRow[]; choices: TaskChoices; filters: TaskFiltersState; canAssign: boolean; selfId: string; today: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.tasks.projects;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="space-y-2">
        <Link href={ROUTES.tasks.projects} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
          {copy.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink"><bdi dir="auto">{project.name}</bdi></h1>
          <span className="font-mono text-xs text-ink-muted" dir="ltr"><bdi dir="ltr">{project.code}</bdi></span>
          <span className="text-xs text-ink-muted">{(copy.statuses as Record<string, string>)[project.status]}</span>
          {canAssign && !editing && <Button type="button" size="sm" variant="outline" className="rounded-full ms-auto" onClick={() => setEditing(true)}>{copy.edit}</Button>}
        </div>
        {project.description && <p className="text-sm text-ink-muted max-w-3xl whitespace-pre-line">{project.description}</p>}
        <div className="max-w-md space-y-1" data-testid="project-progress">
          <Progress value={project.progress} />
          <p className="text-xs text-ink-muted">{[formatMessage(copy.progress, { progress: project.progress }), formatMessage(copy.openTasks, { count: project.open }), project.owner, project.due_date ? formatDate(project.due_date, locale) : ""].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {editing && (
        <Card className="p-5">
          <ProjectForm initial={toInput(project)} choices={choices} onCancel={() => setEditing(false)} onDone={() => { setEditing(false); router.refresh(); }} />
        </Card>
      )}
      <TasksView rows={rows} choices={choices} filters={filters} canAssign={canAssign} selfId={selfId} today={today} projectId={project.id} />
    </div>
  );
}
