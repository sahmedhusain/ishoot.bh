import { dashboardDepartments } from "@platform/database";
import { DashboardBoard } from "../../components/dashboard/DashboardBoard";
import { dashboardContext, dashboardLayoutFor, loadDashboardData } from "../../lib/dashboard-widgets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await dashboardContext();
  const { layout, custom } = await dashboardLayoutFor(ctx);
  const [data, departments] = await Promise.all([loadDashboardData(ctx, layout), dashboardDepartments(ctx.user.id, false)]);
  const everyDepartment = ctx.grants["employees:read"] === true && ctx.grants["settings:read"] === true;
  return (
    <DashboardBoard
      desk={ctx.focus}
      layout={layout}
      custom={custom}
      available={Array.from(ctx.available)}
      data={data}
      loaded={layout.map((w) => w.id)}
      showDepartment={departments.length > 0 || everyDepartment}
    />
  );
}
