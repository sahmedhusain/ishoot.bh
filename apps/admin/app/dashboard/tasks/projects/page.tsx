import { listProjects, requireFeatureEnabled, taskChoices } from "@platform/database";
import { requirePagePermission } from "../../../../lib/auth";
import { taskScope } from "../../../../lib/task-scope";
import { ProjectsView } from "../../../../components/tasks/ProjectsView";

export const dynamic = "force-dynamic";

export default async function ProjectsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("tasks", "read");
  await requireFeatureEnabled("tasks");
  const scope = await taskScope();
  const archived = (await searchParams).archived === "1";
  const [projects, choices] = await Promise.all([listProjects(scope, archived), taskChoices(scope)]);
  return <ProjectsView projects={projects} choices={choices} canManage={scope.all} />;
}
