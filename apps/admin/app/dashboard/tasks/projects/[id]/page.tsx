import { notFound } from "next/navigation";
import { listProjects, listTasks, requireFeatureEnabled, taskChoices } from "@platform/database";
import { requirePagePermission } from "../../../../../lib/auth";
import { taskScope } from "../../../../../lib/task-scope";
import { ProjectView } from "../../../../../components/tasks/ProjectsView";

export const dynamic = "force-dynamic";

export default async function ProjectRoute({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("tasks", "read");
  await requireFeatureEnabled("tasks");
  const scope = await taskScope();
  const { id } = await params;
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const project = (await listProjects(scope, true)).find((p) => p.id === id);
  if (!project) notFound();
  const view = (["mine", "board", "all"] as const).find((v) => v === text("view")) ?? "board";
  const filters = { view, q: text("q"), project: id, assignee: text("assignee"), department: text("department") };
  const [rows, choices] = await Promise.all([listTasks(scope, { q: filters.q, projectId: id, assigneeId: filters.assignee, departmentId: filters.department, mine: view === "mine" }), taskChoices(scope)]);
  return <ProjectView project={project} rows={rows} choices={choices} filters={filters} canAssign={scope.all} selfId={scope.userId} today={new Date().toISOString().slice(0, 10)} />;
}
