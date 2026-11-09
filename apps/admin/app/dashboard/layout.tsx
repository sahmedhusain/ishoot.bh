import * as React from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { WorkspaceInteractions } from "../../components/layout/WorkspaceInteractions";
import { Topbar } from "../../components/layout/Topbar";
import { SidebarProvider } from "../../components/layout/SidebarContext";
import { getCachedCompanySettings, getCachedFeatureToggles } from "../../lib/cached-queries";
import { getCurrentPermissions, requireAuth } from "../../lib/auth";
import { getActiveTaxSummary } from "@platform/database";
import { PermissionsProvider } from "../../hooks/usePermissions";
import { FeatureTogglesProvider } from "../../hooks/useFeatureToggles";
import { CompanyVatProvider } from "../../hooks/useCompanyVat";
import { LiveProvider } from "../../components/live/LiveProvider";
import { NotificationAlerts } from "../../components/live/NotificationAlerts";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const [company, toggles, permissions, reports, headedDepartments, taxes] = await Promise.all([
    getCachedCompanySettings(),
    getCachedFeatureToggles(),
    getCurrentPermissions(),
    Promise.resolve(0),
    Promise.resolve(0),
    getActiveTaxSummary(),
  ]);
  const hasEnoughCompanyData = Boolean(
    company.setup_completed ||
    company.company_name_en ||
    company.company_name_ar
  );
  if (!hasEnoughCompanyData) redirect("/setup");

  return (
    <PermissionsProvider
      user={{
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url ?? null,
        permissions,
        managesTeam: user.role === "super_admin" || user.role === "admin" || reports + headedDepartments > 0,
      }}
    >
      <FeatureTogglesProvider initialFeatures={toggles}>
        <CompanyVatProvider
          value={{
            enabled: Boolean(company.vat_enabled),
            rate: company.vat_enabled ? Number(company.vat_percentage ?? 10) : 0,
            taxes: company.vat_enabled ? (taxes || []) : [],
          }}
        >
          <SidebarProvider>
            <LiveProvider userId={user.id}>
            <NotificationAlerts />
            <div className="admin-shell text-on-surface">
              <WorkspaceInteractions />
              <Topbar
                company={{
                  company_name_en: company.company_name_en,
                  company_name_ar: company.company_name_ar,
                  logo_url: company.logo_url,
                  dark_logo_url: company.dark_logo_url,
                  full_logo_url: company.full_logo_url,
                  dark_full_logo_url: company.dark_full_logo_url,
                  icon_url: company.icon_url,
                  dark_icon_url: company.dark_icon_url,
                }}
              />

              <div className="admin-workspace">
                <Sidebar />
                <main id="admin-main" className="admin-main">
                  <div className="admin-page">{children}</div>
                </main>
              </div>
            </div>
            </LiveProvider>
          </SidebarProvider>
        </CompanyVatProvider>
      </FeatureTogglesProvider>
    </PermissionsProvider>
  );
}
