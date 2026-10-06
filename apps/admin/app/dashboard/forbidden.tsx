import { ForbiddenView } from "../../components/shared/ForbiddenView";

/** Inside the dashboard shell, so the sidebar stays available when a role opens a page it may not see. */
export default function DashboardForbidden() {
  return <ForbiddenView />;
}
