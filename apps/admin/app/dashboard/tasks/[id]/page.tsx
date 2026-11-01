import { notFound } from "next/navigation";
import { getTask, requireFeatureEnabled, taskChoices } from "@platform/database";
import { requirePagePermission } from "../../../../lib/auth";
import { taskScope } from "../../../../lib/task-scope";
import { TaskView } from "../../../../components/tasks/TaskView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("tasks/[id]");

export const dynamic = "force-dynamic";

export default async function TaskRoute({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("tasks", "read");
  await requireFeatureEnabled("tasks");
  const scope = await taskScope();
  const { id } = await params;
  const [task, choices] = await Promise.all([getTask(id, scope), taskChoices(scope)]);
  if (!task) notFound();
  return <TaskView task={task} choices={choices} canAssign={scope.all} selfId={scope.userId} />;
}
