import { redirect } from "next/navigation";
import { requireAuth } from "../../../../lib/auth";
import { ROUTES } from "../../../../constants/routes";
export default async function SecuritySettingsPage() {
  await requireAuth();
  redirect(ROUTES.profile() + "#security");
}
