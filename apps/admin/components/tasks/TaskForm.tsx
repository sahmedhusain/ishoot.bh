"use client";

import * as React from "react";
import { Button, Input, Select, Textarea } from "@platform/ui";
import { TASK_PRIORITIES, TASK_STATUSES } from "@platform/database/constants/tasks";
import type { TaskChoices, TaskInput } from "@platform/database";
import { saveTaskAction } from "../../app/actions/tasks";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

export function TaskForm({ initial, choices, canAssign, selfId, onSaved, onCancel }: { initial: TaskInput; choices: TaskChoices; canAssign: boolean; selfId: string; onSaved: (id: string) => void; onCancel: () => void }) {
  const { t, locale } = useAdminLocale();
  const copy = t.tasks.form;
  const [form, setForm] = React.useState<TaskInput>(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const people = canAssign ? choices.users : choices.users.filter((u) => u.id === selfId || u.id === initial.assigneeId);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await saveTaskAction(form);
      onSaved(result.id);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid sm:grid-cols-2 gap-4" data-testid="task-form">
      <Field label={copy.title} wide>{(id) => <Input id={id} name="taskTitle" maxLength={200} autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.description} wide>{(id) => <Textarea id={id} name="taskDescription" rows={3} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.assignee}>
        {(id) => (
          <Select id={id} name="taskAssignee" value={form.assigneeId ?? ""} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="rounded-lg">
            <option value="">{t.tasks.unassigned}</option>
            {people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.dueDate}>{(id) => <Input id={id} name="taskDue" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="rounded-lg" />}</Field>
      <Field label={copy.priority}>
        {(id) => (
          <Select id={id} name="taskPriority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg">
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{t.tasks.priorities[p]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.status}>
        {(id) => (
          <Select id={id} name="taskStatus" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg">
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{t.tasks.statuses[s]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.project}>
        {(id) => (
          <Select id={id} name="taskProject" value={form.projectId ?? ""} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="rounded-lg">
            <option value="">{copy.noProject}</option>
            {choices.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.department}>
        {(id) => (
          <Select id={id} name="taskDepartment" value={form.departmentId ?? ""} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="rounded-lg">
            <option value="">{copy.noDepartment}</option>
            {choices.departments.map((d) => <option key={d.id} value={d.id}>{locale === "ar" ? d.name_ar : d.name_en}</option>)}
          </Select>
        )}
      </Field>
      <Field label={copy.startDate}>{(id) => <Input id={id} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg" />}</Field>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy || !form.title.trim()} onClick={() => void save()} data-testid="task-save">{copy.save}</Button>
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>{copy.cancel}</Button>
      </div>
    </div>
  );
}

export const emptyTask = (defaults: Partial<TaskInput> = {}): TaskInput => ({ title: "", description: "", status: "todo", priority: "normal", assigneeId: "", departmentId: "", projectId: "", startDate: "", dueDate: "", ...defaults });
