import { requireUser } from "../../../lib/session";
import { SettingsView } from "../../../components/SettingsView";

export default async function SettingsPage() {
  const user = await requireUser();
  return <SettingsView email={user.email} roles={user.roles} />;
}
