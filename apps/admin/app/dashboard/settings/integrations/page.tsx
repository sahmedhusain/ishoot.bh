import {
  INTEGRATION_PROVIDERS,
  integrationSetupLinks,
} from "@platform/database/constants/integrations";
import { domainOrigin } from "@platform/database/constants/domains";
import { publicOrigin } from "../../../../lib/public-origin";
import { forbidden } from "next/navigation";
import {
  db,
  getCompanySettings,
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
  const [integrations, feed, sync, company, adminOrigin] = await Promise.all([
    canManage ? listIntegrationsForAdmin() : Promise.resolve([]),
    canCalendar ? getCalendarFeedInfo(user.id) : Promise.resolve(null),
    db.integrationSetting.findUnique({
      where: { provider: "google_calendar" },
      select: { isActive: true },
    }),
    canManage ? getCompanySettings() : Promise.resolve(null),
    canManage ? publicOrigin() : Promise.resolve(""),
  ]);
  const website =
    process.env.WEB_URL ||
    domainOrigin(company?.website_domain) ||
    company?.website ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  return (
    <IntegrationsView
      integrations={integrations}
      setupLinks={
        canManage
          ? Object.fromEntries(
            INTEGRATION_PROVIDERS.map((provider) => [
              provider.id,
              integrationSetupLinks(provider.id, website, adminOrigin),
            ]),
          )
          : {}
      }
      canManage={canManage}
      calendar={
        canCalendar ? { feed, syncEnabled: sync?.isActive ?? true } : null
      }
    />
  );
}
