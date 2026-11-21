import { redirect } from "next/navigation";
import { requireAuth } from "../../../lib/auth";
import { ROUTES } from "../../../constants/routes";
import { RestrictedSettingNotice } from "../../../components/settings/RestrictedSettingNotice";

export const dynamic = "force-dynamic";

export default async function SettingsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ restricted?: string; section?: string }>;
}) {
  const [, params] = await Promise.all([requireAuth(), searchParams]);
  if (params.restricted !== "1") {
    redirect(ROUTES.settings.preferences);
  }

  return <RestrictedSettingNotice />;
}
