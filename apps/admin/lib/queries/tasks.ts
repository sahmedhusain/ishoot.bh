import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import {
  OPEN_TASK_STATUSES,
  PROJECT_STATUSES,
  TASK_LINK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  projectProgress,
  type TaskStatus,
} from "../constants/tasks";
import {
  listTasks as listWorkflowTasks,
  createTask as createWorkflowTask,
  updateTask as updateWorkflowTask,
  updateTaskStatus as updateWorkflowTaskStatus,
} from "../api/workflow";
import {
  listSystemProjects,
  createSystemProject,
  updateSystemProject,
} from "../api/system-catalog";
import { listDepartments, listEmployees } from "../api/hr";

export interface TaskScope {
  userId: string;
  departmentId: string | null;
  all: boolean;
}

const dateOnly = (value: Date | string | null | undefined) =>
  value ? String(value).slice(0, 10) : null;
const parseDate = (text: string) => {
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new Error(serverMessages.taskInvalid);
  return new Date(`${text}T00:00:00Z`);
};

export interface TaskFilters {
  q?: string;
  status?: string;
  projectId?: string;
  assigneeId?: string;
  departmentId?: string;
  mine?: boolean;
  closed?: boolean;
}

function empDisplayName(emp: any): string {
  return (
    `${emp?.firstNameEn || emp?.firstName || ""} ${emp?.lastNameEn || emp?.lastName || ""}`.trim() ||
    emp?.nameEn ||
    emp?.email ||
    ""
  );
}

function mapRelatedLink(t: any): { type: string; id: string } | null {
  if (t.relatedEntityType && t.relatedEntityId)
    return { type: t.relatedEntityType, id: t.relatedEntityId };
  if (t.clientId) return { type: "contact", id: t.clientId };
  if (t.dealId) return { type: "deal", id: t.dealId };
  if (t.momId) return { type: "mom", id: t.momId };
  if (t.documentId) return { type: "document", id: t.documentId };
  if (t.employeeId) return { type: "employee", id: t.employeeId };
  return null;
}

export async function listTasks(scope: TaskScope, filters: TaskFilters = {}) {
  const [apiTasks, employees, projects] = await Promise.all([
    listWorkflowTasks({
      projectId: filters.projectId,
      departmentId: filters.departmentId,
      assignedTo: filters.mine ? scope.userId : filters.assigneeId,
      status: filters.status,
    }).catch(() => []),
    listEmployees().catch(() => []),
    listSystemProjects().catch(() => []),
  ]);

  const empMap = new Map<string, any>(
    (employees || []).map((e: any) => [e.id, e] as [string, any]),
  );
  const projMap = new Map<string, any>(
    (projects || []).map((p: any) => [p.id, p] as [string, any]),
  );
  const q = filters.q?.trim().toLowerCase();

  return (apiTasks || [])
    .filter((t) => {
      if (!scope.all) {
        const matchesUser = t.assignedTo === scope.userId || t.employeeId === scope.userId;
        const matchesDept = scope.departmentId && t.departmentId === scope.departmentId;
        if (!matchesUser && !matchesDept) return false;
      }
      if (filters.status) {
        if (t.status !== filters.status) return false;
      } else if (!filters.closed && !(OPEN_TASK_STATUSES as readonly string[]).includes(t.status) && t.status !== "done") {
        return false;
      }
      if (q) {
        const hit = [t.title, t.description].filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    })
    .map((t, idx) => {
      const emp = t.assignedTo ? empMap.get(t.assignedTo) : undefined;
      const proj = t.projectId ? projMap.get(t.projectId) : undefined;
      return {
        id: t.id,
        number: `TSK-${String(idx + 1).padStart(4, "0")}`,
        title: t.title,
        status: t.status || "todo",
        priority: t.priority || "normal",
        assignee_id: t.assignedTo ?? "",
        assignee: emp ? empDisplayName(emp) : "",
        department_id: t.departmentId || emp?.departmentId || "",
        project: proj ? { id: proj.id, name: proj.name || proj.code, color: "#6366f1" } : null,
        due_date: dateOnly(t.dueDate),
        comments: 0,
        link: mapRelatedLink(t),
      };
    });
}
export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];

export async function getTask(id: string, scope: TaskScope) {
  const [apiTasks, employees, projects] = await Promise.all([
    listWorkflowTasks().catch(() => []),
    listEmployees().catch(() => []),
    listSystemProjects().catch(() => []),
  ]);
  const t = (apiTasks || []).find((row) => row.id === id);
  if (!t) return null;
  if (!scope.all && t.assignedTo !== scope.userId && (!scope.departmentId || t.departmentId !== scope.departmentId)) {
    return null;
  }
  const emp = t.assignedTo ? (employees || []).find((e: any) => e.id === t.assignedTo) : undefined;
  const proj = t.projectId ? (projects || []).find((p: any) => p.id === t.projectId) : undefined;
  const link = mapRelatedLink(t);
  return {
    id: t.id,
    number: `TSK-${t.id.slice(0, 6).toUpperCase()}`,
    title: t.title,
    description: t.description ?? "",
    status: t.status || "todo",
    priority: t.priority || "normal",
    project_id: t.projectId ?? "",
    project: proj ? { id: proj.id, name: proj.name || proj.code, color: "#6366f1" } : null,
    assignee_id: t.assignedTo ?? "",
    assignee: emp ? empDisplayName(emp) : "",
    department_id: t.departmentId ?? "",
    start_date: null,
    due_date: dateOnly(t.dueDate),
    link_type: link?.type ?? "",
    link_id: link?.id ?? "",
    created_by: "",
    created_at: t.createdAt,
    completed_at: t.status === "done" ? t.updatedAt : null,
    comments: [] as Array<{ id: string; body: string; author: string; author_id: string; at: string }>,
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
  employeeId?: string;
  documentId?: string;
  clientId?: string;
  dealId?: string;
}

export async function saveTask(input: TaskInput, _scope: TaskScope) {
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

  const payload = {
    title,
    description: input.description.trim().slice(0, 5000) || null,
    projectId: input.projectId || null,
    status: input.status,
    priority: input.priority,
    assignedTo: input.assigneeId || null,
    departmentId: input.departmentId || null,
    dueDate: dueDate ? dueDate.toISOString() : null,
    relatedEntityType: linkType,
    relatedEntityId: linkType ? input.linkId!.slice(0, 60) : null,
    clientId: input.clientId || (linkType === "contact" ? input.linkId : null) || null,
    dealId: input.dealId || (linkType === "deal" ? input.linkId : null) || null,
    momId: linkType === "mom" ? input.linkId : null,
    employeeId: input.employeeId || (linkType === "employee" ? input.linkId : null) || null,
    documentId: input.documentId || (linkType === "document" ? input.linkId : null) || null,
  };

  if (input.id) {
    return updateWorkflowTask(input.id, payload);
  }
  return createWorkflowTask(payload);
}

export async function moveTask(id: string, status: string, _scope: TaskScope) {
  if (!(TASK_STATUSES as readonly string[]).includes(status))
    throw new Error(serverMessages.taskInvalid);
  await updateWorkflowTaskStatus(id, status);
}

export async function addTaskComment(
  id: string,
  body: string,
  _scope: TaskScope,
) {
  const text = body.trim().slice(0, 4000);
  if (!text) throw new Error(serverMessages.taskCommentEmpty);
  const task = (await listWorkflowTasks().catch(() => [])).find((t) => t.id === id);
  if (!task) throw new Error(serverMessages.taskNotFound);
  const copy = getTranslations("en").admin.tasks.notifications.comment;
  void formatMessage(copy.title, { number: task.id, title: task.title });
}

export async function remindDueTasks() {
  return 0;
}

export async function listProjects(scope: TaskScope, includeArchived = false) {
  const [rows, apiTasks, employees] = await Promise.all([
    listSystemProjects().catch(() => []),
    listWorkflowTasks().catch(() => []),
    listEmployees().catch(() => []),
  ]);
  const empMap = new Map<string, any>(
    (employees || []).map((e: any) => [e.id, e] as [string, any]),
  );
  return (rows || [])
    .filter((p) => includeArchived || p.status !== "archived")
    .filter((p) => {
      if (scope.all) return true;
      if (scope.departmentId && p.departmentId === scope.departmentId) return true;
      return (apiTasks || []).some((t) => t.projectId === p.id && t.assignedTo === scope.userId);
    })
    .map((p) => {
      const pTasks = (apiTasks || []).filter((t) => t.projectId === p.id);
      const byStatus: Partial<Record<TaskStatus, number>> = {};
      for (const t of pTasks) {
        const s = (t.status || "todo") as TaskStatus;
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }
      const open = (byStatus.todo ?? 0) + (byStatus.in_progress ?? 0) + (byStatus.review ?? 0);
      return {
        id: p.id,
        code: p.code,
        name: p.name || p.code,
        description: p.description ?? "",
        status: p.status || "active",
        color: "#6366f1",
        department_id: p.departmentId ?? "",
        owner_id: "",
        owner: empMap.get(p.departmentId ?? "") ? "" : "",
        start_date: dateOnly(p.startDate),
        due_date: dateOnly(p.endDate),
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

export async function saveProject(input: ProjectInput, _userId: string) {
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
  const payload = {
    code: `PRJ-${Date.now().toString().slice(-6)}`,
    name,
    description: input.description.trim().slice(0, 5000) || null,
    status: input.status,
    departmentId: input.departmentId || null,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: dueDate ? dueDate.toISOString() : null,
  };
  if (input.id) return updateSystemProject(input.id, payload);
  return createSystemProject(payload);
}

export async function taskChoices(scope: TaskScope) {
  const [apiDepts, apiEmps, projects] = await Promise.all([
    listDepartments().catch(() => []),
    listEmployees().catch(() => []),
    listProjects(scope),
  ]);
  return {
    users: (apiEmps || []).map((e: any) => ({
      id: e.id,
      name: empDisplayName(e) || "Staff",
      department_id: e.departmentId ?? "",
    })),
    departments: (apiDepts || []).map((d: any) => ({
      id: d.id,
      name_en: d.nameEn || "",
      name_ar: d.nameAr || "",
    })),
    projects: projects.map((p) => ({ id: p.id, name: p.name, color: p.color })),
  };
}
export type TaskChoices = Awaited<ReturnType<typeof taskChoices>>;
