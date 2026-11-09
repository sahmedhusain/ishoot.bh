import { Prisma } from "@prisma/client";
import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import { db } from "../atomic";
import {
  OPEN_TASK_STATUSES,
  PROJECT_STATUSES,
  TASK_LINK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  projectProgress,
  type TaskStatus,
} from "../constants/tasks";
import { createNotification } from "./notifications";
import { getNextSequenceNumber } from "./sequence";

export interface TaskScope {
  userId: string;
  departmentId: string | null;
  all: boolean;
}

function scopeWhere(scope: TaskScope): Prisma.TaskWhereInput {
  if (scope.all) return {};
  return {
    OR: [
      { assigneeId: scope.userId },
      { createdById: scope.userId },
      ...(scope.departmentId ? [{ departmentId: scope.departmentId }] : []),
      { project: { ownerId: scope.userId } },
    ],
  };
}

const dateOnly = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;
const parseDate = (text: string) => {
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new Error(serverMessages.taskInvalid);
  return new Date(`${text}T00:00:00Z`);
};

async function userNames(ids: (string | null | undefined)[]) {
  const wanted = Array.from(new Set(ids.filter((v): v is string => !!v)));
  const users = wanted.length
    ? await db.user.findMany({
        where: { id: { in: wanted } },
        select: { id: true, fullName: true },
      })
    : [];
  return new Map<string, string>(users.map((u: any) => [u.id, u.fullName]));
}

export interface TaskFilters {
  q?: string;
  status?: string;
  projectId?: string;
  assigneeId?: string;
  departmentId?: string;
  mine?: boolean;
  closed?: boolean;
}

export async function listTasks(scope: TaskScope, filters: TaskFilters = {}) {
  const and: Prisma.TaskWhereInput[] = [scopeWhere(scope)];
  if (
    filters.status &&
    (TASK_STATUSES as readonly string[]).includes(filters.status)
  )
    and.push({ status: filters.status });
  else if (!filters.closed)
    and.push({ status: { in: [...OPEN_TASK_STATUSES, "done"] } });
  if (filters.projectId) and.push({ projectId: filters.projectId });
  if (filters.assigneeId) and.push({ assigneeId: filters.assigneeId });
  if (filters.departmentId) and.push({ departmentId: filters.departmentId });
  if (filters.mine) and.push({ assigneeId: scope.userId });
  const q = filters.q?.trim();
  if (q)
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { number: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    });
  const rows = await db.task.findMany({
    where: { AND: and },
    orderBy: [
      { sortOrder: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
    take: 500,
    include: {
      project: { select: { id: true, name: true, color: true } },
      _count: { select: { comments: true } },
    },
  });
  const cutoff = Date.now() - 14 * 86_400_000;
  const visible =
    filters.closed || filters.status
      ? rows
      : rows.filter(
          (t) =>
            t.status !== "done" || (t.completedAt?.getTime() ?? 0) >= cutoff,
        );
  if (!visible.length) {
    const { listTasks: listWorkflowTasks } = await import("../api/workflow");
    const { listEmployees } = await import("../api/hr");
    const [apiTasks, employees] = await Promise.all([
      listWorkflowTasks().catch(() => []),
      listEmployees().catch(() => []),
    ]);
    if (apiTasks && apiTasks.length) {
      const empMap = new Map<string, any>((employees || []).map((e: any) => [e.id || e.ID, e] as [string, any]));
      return apiTasks.map((t: any, idx: number) => {
        const emp: any = t.assignedTo ? empMap.get(t.assignedTo) : undefined;
        const assigneeName = emp ? `${emp.firstNameEn || emp.firstName || ""} ${emp.lastNameEn || emp.lastName || ""}`.trim() : (t.assignee || "");
        return {
          id: t.id || t.ID || "",
          number: t.number || `TSK-${String(idx + 1).padStart(4, "0")}`,
          title: t.title || t.Title || "",
          status: t.status || t.Status || "todo",
          priority: t.priority || t.Priority || "normal",
          assignee_id: t.assignedTo || t.AssignedTo || "",
          assignee: assigneeName,
          department_id: t.departmentId || emp?.departmentId || "",
          project: null,
          due_date: t.dueDate ? String(t.dueDate).slice(0, 10) : null,
          comments: 0,
          link: t.relatedEntityType && t.relatedEntityId ? { type: t.relatedEntityType, id: t.relatedEntityId } : null,
        };
      });
    }
  }
  const names = await userNames(visible.map((t) => t.assigneeId));
  return visible.map((t) => ({
    id: t.id,
    number: t.number,
    title: t.title,
    status: t.status,
    priority: t.priority,
    assignee_id: t.assigneeId ?? "",
    assignee: names.get(t.assigneeId ?? "") ?? "",
    department_id: t.departmentId ?? "",
    project: t.project
      ? { id: t.project.id, name: t.project.name, color: t.project.color }
      : null,
    due_date: dateOnly(t.dueDate),
    comments: t._count.comments,
    link: t.linkType && t.linkId ? { type: t.linkType, id: t.linkId } : null,
  }));
}
export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];

export async function getTask(id: string, scope: TaskScope) {
  const t = await db.task.findFirst({
    where: { AND: [{ id }, scopeWhere(scope)] },
    include: {
      project: { select: { id: true, name: true, color: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!t) return null;
  const names = await userNames([
    t.assigneeId,
    t.createdById,
    ...t.comments.map((c) => c.authorId),
  ]);
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    project_id: t.projectId ?? "",
    project: t.project
      ? { id: t.project.id, name: t.project.name, color: t.project.color }
      : null,
    assignee_id: t.assigneeId ?? "",
    assignee: names.get(t.assigneeId ?? "") ?? "",
    department_id: t.departmentId ?? "",
    start_date: dateOnly(t.startDate),
    due_date: dateOnly(t.dueDate),
    link_type: t.linkType ?? "",
    link_id: t.linkId ?? "",
    created_by: names.get(t.createdById ?? "") ?? "",
    created_at: t.createdAt.toISOString(),
    completed_at: t.completedAt?.toISOString() ?? null,
    comments: t.comments.map((c) => ({
      id: c.id,
      body: c.body,
      author: names.get(c.authorId ?? "") ?? "",
      author_id: c.authorId ?? "",
      at: c.createdAt.toISOString(),
    })),
  };
}
export type TaskRecord = NonNullable<Awaited<ReturnType<typeof getTask>>>;

export interface TaskInput {
  id?: string;
  title: string;
  description: string;
  projectId?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  departmentId?: string;
  startDate: string;
  dueDate: string;
  linkType?: string;
  linkId?: string;
}

async function notifyAssignee(
  task: {
    id: string;
    number: string;
    title: string;
    assigneeId: string | null;
  },
  byId: string,
) {
  if (!task.assigneeId || task.assigneeId === byId) return;
  const copy = getTranslations("en").admin.tasks.notifications.assigned;
  const params = { number: task.number, title: task.title };
  await createNotification({
    user_id: task.assigneeId,
    title: formatMessage(copy.title, params),
    message: formatMessage(copy.message, params),
    message_key: "tasks.notifications.assigned",
    message_params: params,
    type: "action",
    entity_type: "task",
    entity_id: task.id,
  });
}

export async function saveTask(input: TaskInput, scope: TaskScope) {
  const title = input.title.trim().slice(0, 200);
  if (
    !title ||
    !(TASK_STATUSES as readonly string[]).includes(input.status) ||
    !(TASK_PRIORITIES as readonly string[]).includes(input.priority)
  )
    throw new Error(serverMessages.taskInvalid);
  const startDate = parseDate(input.startDate);
  const dueDate = parseDate(input.dueDate);
  if (startDate && dueDate && startDate > dueDate)
    throw new Error(serverMessages.taskDatesInvalid);
  const linkType = input.linkType && input.linkId ? input.linkType : null;
  if (linkType && !(TASK_LINK_TYPES as readonly string[]).includes(linkType))
    throw new Error(serverMessages.taskInvalid);
  if (
    input.assigneeId &&
    !(await db.user.findFirst({
      where: { id: input.assigneeId, isActive: true, archivedAt: null },
      select: { id: true },
    }))
  )
    throw new Error(serverMessages.taskAssigneeInvalid);
  const existing = input.id
    ? await db.task.findFirst({
        where: { AND: [{ id: input.id }, scopeWhere(scope)] },
      })
    : null;
  if (input.id && !existing) throw new Error(serverMessages.taskNotFound);
  if (
    !scope.all &&
    input.assigneeId &&
    input.assigneeId !== scope.userId &&
    existing?.assigneeId !== input.assigneeId
  )
    throw new Error(serverMessages.taskAssignNotAllowed);
  const data = {
    title,
    description: input.description.trim().slice(0, 5000) || null,
    projectId: input.projectId || null,
    status: input.status,
    priority: input.priority,
    assigneeId: input.assigneeId || null,
    departmentId: input.departmentId || null,
    startDate,
    dueDate,
    linkType,
    linkId: linkType ? input.linkId!.slice(0, 60) : null,
  };
  if (existing) {
    const task = await db.task.update({
      where: { id: existing.id },
      data: {
        ...data,
        completedAt:
          input.status === "done" ? (existing.completedAt ?? new Date()) : null,
        ...(existing.dueDate?.getTime() !== dueDate?.getTime()
          ? { remindedAt: null }
          : {}),
      },
    });
    if (task.assigneeId !== existing.assigneeId)
      await notifyAssignee(task, scope.userId);
    return task;
  }
  const number = await getNextSequenceNumber("TSK");
  const task = await db.task.create({
    data: {
      ...data,
      completedAt: input.status === "done" ? new Date() : null,
      number,
      createdById: scope.userId,
    },
  });
  await notifyAssignee(task, scope.userId);
  return task;
}

export async function moveTask(id: string, status: string, scope: TaskScope) {
  if (!(TASK_STATUSES as readonly string[]).includes(status))
    throw new Error(serverMessages.taskInvalid);
  const task = await db.task.findFirst({
    where: { AND: [{ id }, scopeWhere(scope)] },
  });
  if (!task) throw new Error(serverMessages.taskNotFound);
  await db.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "done" ? (task.completedAt ?? new Date()) : null,
    },
  });
  if (
    status === "done" &&
    task.status !== "done" &&
    task.createdById &&
    task.createdById !== scope.userId
  ) {
    const copy = getTranslations("en").admin.tasks.notifications.done;
    const params = { number: task.number, title: task.title };
    await createNotification({
      user_id: task.createdById,
      title: formatMessage(copy.title, params),
      message: formatMessage(copy.message, params),
      message_key: "tasks.notifications.done",
      message_params: params,
      type: "success",
      entity_type: "task",
      entity_id: task.id,
    });
  }
}

export async function addTaskComment(
  id: string,
  body: string,
  scope: TaskScope,
) {
  const text = body.trim().slice(0, 4000);
  if (!text) throw new Error(serverMessages.taskCommentEmpty);
  const task = await db.task.findFirst({
    where: { AND: [{ id }, scopeWhere(scope)] },
  });
  if (!task) throw new Error(serverMessages.taskNotFound);
  await db.taskComment.create({
    data: { taskId: id, authorId: scope.userId, body: text },
  });
  const copy = getTranslations("en").admin.tasks.notifications.comment;
  const params = { number: task.number, title: task.title };
  for (const userId of Array.from(
    new Set([task.assigneeId, task.createdById]),
  )) {
    if (!userId || userId === scope.userId) continue;
    await createNotification({
      user_id: userId,
      title: formatMessage(copy.title, params),
      message: formatMessage(copy.message, params),
      message_key: "tasks.notifications.comment",
      message_params: params,
      type: "info",
      entity_type: "task",
      entity_id: id,
    });
  }
}

export async function remindDueTasks(now = new Date()) {
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const due = await db.task.findMany({
    where: {
      status: { in: OPEN_TASK_STATUSES },
      assigneeId: { not: null },
      dueDate: { lte: tomorrow },
      remindedAt: null,
    },
    take: 500,
  });
  const copy = getTranslations("en").admin.tasks.notifications.due;
  for (const task of due) {
    const params = {
      number: task.number,
      title: task.title,
      date: dateOnly(task.dueDate) ?? "",
    };
    await createNotification({
      user_id: task.assigneeId!,
      title: formatMessage(copy.title, params),
      message: formatMessage(copy.message, params),
      message_key: "tasks.notifications.due",
      message_params: params,
      type: "warning",
      entity_type: "task",
      entity_id: task.id,
    });
    await db.task.update({ where: { id: task.id }, data: { remindedAt: now } });
  }
  return due.length;
}

export async function listProjects(scope: TaskScope, includeArchived = false) {
  const rows = await db.project.findMany({
    where: {
      ...(includeArchived ? {} : { status: { not: "archived" } }),
      ...(scope.all
        ? {}
        : {
            OR: [
              { ownerId: scope.userId },
              { createdById: scope.userId },
              ...(scope.departmentId
                ? [{ departmentId: scope.departmentId }]
                : []),
              { tasks: { some: { assigneeId: scope.userId } } },
            ],
          }),
    },
    orderBy: [
      { status: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { name: "asc" },
    ],
    take: 200,
  });
  const counts = rows.length
    ? await db.task.groupBy({
        by: ["projectId", "status"],
        where: { projectId: { in: rows.map((p) => p.id) } },
        _count: { _all: true },
      })
    : [];
  const owners = await userNames(rows.map((p) => p.ownerId));
  return rows.map((p) => {
    const byStatus = Object.fromEntries(
      counts
        .filter((c) => c.projectId === p.id)
        .map((c) => [c.status, c._count._all]),
    ) as Partial<Record<TaskStatus, number>>;
    const open =
      (byStatus.todo ?? 0) +
      (byStatus.in_progress ?? 0) +
      (byStatus.review ?? 0);
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      color: p.color,
      department_id: p.departmentId ?? "",
      owner_id: p.ownerId ?? "",
      owner: owners.get(p.ownerId ?? "") ?? "",
      start_date: dateOnly(p.startDate),
      due_date: dateOnly(p.dueDate),
      open,
      done: byStatus.done ?? 0,
      progress: projectProgress(byStatus),
    };
  });
}
export type ProjectRow = Awaited<ReturnType<typeof listProjects>>[number];

export interface ProjectInput {
  id?: string;
  name: string;
  description: string;
  status: string;
  departmentId?: string;
  ownerId?: string;
  color: string;
  startDate: string;
  dueDate: string;
}

export async function saveProject(input: ProjectInput, userId: string) {
  const name = input.name.trim().slice(0, 160);
  if (
    !name ||
    !(PROJECT_STATUSES as readonly string[]).includes(input.status) ||
    !/^#[0-9A-Fa-f]{6}$/.test(input.color)
  )
    throw new Error(serverMessages.projectInvalid);
  const startDate = parseDate(input.startDate);
  const dueDate = parseDate(input.dueDate);
  if (startDate && dueDate && startDate > dueDate)
    throw new Error(serverMessages.taskDatesInvalid);
  const data = {
    name,
    description: input.description.trim().slice(0, 5000) || null,
    status: input.status,
    departmentId: input.departmentId || null,
    ownerId: input.ownerId || null,
    color: input.color,
    startDate,
    dueDate,
  };
  if (input.id) return db.project.update({ where: { id: input.id }, data });
  return db.project.create({
    data: {
      ...data,
      code: await getNextSequenceNumber("PRJ"),
      createdById: userId,
    },
  });
}

export async function taskChoices(scope: TaskScope) {
  let [users, departments, projects] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, archivedAt: null, role: { not: "viewer" } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, departmentId: true },
      take: 2000,
    }),
    db.department.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { id: true, nameEn: true, nameAr: true },
    }),
    listProjects(scope),
  ]);
  if (!departments.length || !users.length) {
    const { listDepartments, listEmployees } = await import("../api/hr");
    const [apiDepts, apiEmps] = await Promise.all([
      listDepartments().catch(() => []),
      listEmployees().catch(() => []),
    ]);
    if (!departments.length && apiDepts.length) {
      departments = apiDepts.map((d: any) => ({
        id: d.id || d.ID,
        nameEn: d.nameEn || d.NameEn || "",
        nameAr: d.nameAr || d.NameAr || "",
      }));
    }
    if (apiEmps.length) {
      users = apiEmps.map((e: any) => ({
        id: e.id || e.ID,
        fullName: `${e.firstNameEn || e.firstName || ""} ${e.lastNameEn || e.lastName || ""}`.trim() || e.nameEn || "Staff",
        departmentId: e.departmentId || e.DepartmentID || null,
      }));
    }
  }
  return {
    users: users.map((u: any) => ({
      id: u.id,
      name: u.fullName,
      department_id: u.departmentId ?? "",
    })),
    departments: departments.map((d: any) => ({
      id: d.id,
      name_en: d.nameEn,
      name_ar: d.nameAr,
    })),
    projects: projects.map((p) => ({ id: p.id, name: p.name, color: p.color })),
  };
}
export type TaskChoices = Awaited<ReturnType<typeof taskChoices>>;
