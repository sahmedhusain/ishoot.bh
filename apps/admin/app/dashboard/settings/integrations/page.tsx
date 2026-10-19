import { forbidden } from "next/navigation";
import {
  db,
  getCalendarFeedInfo,
  listIntegrationsForAdmin,
} from "@platform/database";
import { hasPermission, requireAuth } from "../../../../lib/auth";
import { IntegrationsView } from "../../../../components/settings/IntegrationsView";

export const dynamic = "force-dynamic";

/**
 * Integrations: administrators connect Meta, WhatsApp, YouTube and the other services; everyone with calendar access
 * links their own calendar (Google Calendar, Outlook, Apple) here.
 */
export default async function IntegrationsSettingsPage() {
  const user = await requireAuth();
  const [canManage, canCalendar] = await Promise.all([
    hasPermission("settings", "write"),
    hasPermission("calendar", "read"),
  ]);
  if (!canManage && !canCalendar) forbidden();
  // Secrets are reduced to "set" flags and a short hint before reaching the browser.
  const [integrations, feed, sync] = await Promise.all([
    canManage ? listIntegrationsForAdmin() : Promise.resolve([]),
    canCalendar ? getCalendarFeedInfo(user.id) : Promise.resolve(null),
    db.integrationSetting.findUnique({
      where: { provider: "google_calendar" },
      select: { isActive: true },
    }),
  ]);
  return (
    <IntegrationsView
      integrations={integrations}
      canManage={canManage}
      calendar={
        canCalendar ? { feed, syncEnabled: sync?.isActive ?? true } : null
      }
    />
  );
}
