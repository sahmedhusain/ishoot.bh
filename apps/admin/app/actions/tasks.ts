"use server";
import { revalidatePath } from "next/cache";
import {
  addTaskComment,
  createActivityLog,
  measureOperation,
  moveTask,
  requireFeatureEnabled,
  saveProject,
  saveTask,
  type ProjectInput,
  type TaskInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { taskScope } from "../../lib/task-scope";
import { announceChange } from "../../lib/live";

const refresh = (id?: string) => {
  revalidatePath(ROUTES.tasks.list);
  if (id) revalidatePath(ROUTES.tasks.detail(id));
  void announceChange("tasks", id);
};

export async function saveTaskAction(input: TaskInput) {
  return measureOperation("action:saveTaskAction", async () => {
    await requireFeatureEnabled("tasks");
    const scope = await taskScope(input.id ? "edit" : "create");
    validateActionArguments("saveTaskAction", { input });
    const task = await saveTask(input, scope);
    await createActivityLog({
      user_id: scope.userId,
      action: input.id ? "update" : "create",
      entity_type: "task",
      entity_id: task.id,
      details: { number: task.number },
    });
    refresh(task.id);
    return { success: true, id: task.id };
  });
}

export async function moveTaskAction(id: string, status: string) {
  return measureOperation("action:moveTaskAction", async () => {
    await requireFeatureEnabled("tasks");
    const scope = await taskScope("edit");
    validateActionArguments("moveTaskAction", { id, status });
    await moveTask(id, status, scope);
    await createActivityLog({
      user_id: scope.userId,
      action: "update",
      entity_type: "task",
      entity_id: id,
      details: { status },
    });
    refresh(id);
    return { success: true };
  });
}

export async function addTaskCommentAction(id: string, body: string) {
  return measureOperation("action:addTaskCommentAction", async () => {
    await requireFeatureEnabled("tasks");
    const scope = await taskScope("read");
    validateActionArguments("addTaskCommentAction", { id, body });
    await addTaskComment(id, body, scope);
    refresh(id);
    return { success: true };
  });
}

export async function saveProjectAction(input: ProjectInput) {
  return measureOperation("action:saveProjectAction", async () => {
    await requireFeatureEnabled("tasks");
    const user = await requirePermission("tasks", "assign");
    validateActionArguments("saveProjectAction", { input });
    const project = await saveProject(input, user.id);
    await createActivityLog({
      user_id: user.id,
      action: input.id ? "update" : "create",
      entity_type: "project",
      entity_id: project.id,
      details: { code: project.code },
    });
    revalidatePath(ROUTES.tasks.projects);
    revalidatePath(ROUTES.tasks.project(project.id));
    return { success: true, id: project.id };
  });
}
