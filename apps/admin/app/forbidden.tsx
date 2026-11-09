import { ForbiddenView } from "../components/shared/ForbiddenView";

/** Rendered (HTTP 403) when a page calls forbidden() because the role lacks the permission. */
export default function Forbidden() {
  return <ForbiddenView />;
}
