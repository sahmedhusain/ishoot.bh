import { listTasks, requireFeatureEnabled, taskChoices } from "@platform/database";
import { requirePagePermission } from "../../../lib/auth";
import { taskScope } from "../../../lib/task-scope";
import { TasksPage } from "../../../components/tasks/TasksPage";
import { pageMetadata } from "../../../lib/company-metadata";
import { LiveRefresh } from "../../../components/live/LiveRefresh";

export const generateMetadata = () => pageMetadata("tasks");

export const dynamic = "force-dynamic";

export default async function TasksRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("tasks", "read");
  await requireFeatureEnabled("tasks");
  const scope = await taskScope();
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const view = (["mine", "board", "all"] as const).find((v) => v === text("view")) ?? "mine";
  const filters = { view, q: text("q"), project: text("project"), assignee: text("assignee"), department: text("department") };
  const [rows, choices] = await Promise.all([listTasks(scope, { q: filters.q, projectId: filters.project, assigneeId: filters.assignee, departmentId: filters.department, mine: view === "mine" }), taskChoices(scope)]);
  return (
    <>
      <LiveRefresh resources={["tasks"]} notificationCategories={["tasks"]} />
      <TasksPage rows={rows} choices={choices} filters={filters} canAssign={scope.all} selfId={scope.userId} today={new Date().toISOString().slice(0, 10)} />
    </>
  );
}
