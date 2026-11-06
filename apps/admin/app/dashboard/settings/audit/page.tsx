import { redirect } from "next/navigation";
import { ROUTES } from "../../../../constants/routes";

export const dynamic = "force-dynamic";

export default function AuditSettingsPage() {
  redirect(ROUTES.settings.preferences);
}
