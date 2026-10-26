import * as React from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { Topbar } from "../../components/layout/Topbar";
import { SidebarProvider } from "../../components/layout/SidebarContext";
import { getCachedCompanySettings, getCachedFeatureToggles } from "../../lib/cached-queries";
import { getCurrentPermissions, requireAuth } from "../../lib/auth";
import { db, getActiveTaxSummary } from "@platform/database";
import { PermissionsProvider } from "../../hooks/usePermissions";
import { FeatureTogglesProvider } from "../../hooks/useFeatureToggles";
import { CompanyVatProvider } from "../../hooks/useCompanyVat";

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
    db.user.count({ where: { managerId: user.id, isActive: true } }),
    db.department.count({ where: { managerId: user.id } }),
    getActiveTaxSummary(),
  ]);
  // A new company is configured through the first-run setup wizard before anyone uses the dashboard.
  if (!company.setup_completed) redirect("/setup");

  return (
    <PermissionsProvider
      user={{
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        permissions,
        managesTeam: user.role === "super_admin" || user.role === "admin" || reports + headedDepartments > 0,
      }}
    >
      <FeatureTogglesProvider initialFeatures={toggles}>
        <CompanyVatProvider value={{ enabled: !!company.vat_enabled, rate: company.vat_enabled ? Number(company.vat_percentage ?? 10) : 0, taxes }}>
          <SidebarProvider>
            <div className="h-screen w-screen overflow-hidden flex flex-col bg-brand-base text-slate-800 dark:bg-brand-base dark:text-ink transition-colors duration-200">
              {/* Fixed Topbar spanning full width with Logo at start */}
              <Topbar
                company={{
                  company_name_en: company.company_name_en,
                  company_name_ar: company.company_name_ar,
                  logo_url: company.logo_url,
                  dark_logo_url: company.dark_logo_url,
                  icon_url: company.icon_url,
                  dark_icon_url: company.dark_icon_url,
                }}
              />

              {/* Workspace below Topbar: Sidebar (fixed on side) + Main Content (scrolls independently) */}
              <div className="flex-1 flex min-h-0 pt-14 overflow-hidden relative">
                <Sidebar />
                <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
        </CompanyVatProvider>
      </FeatureTogglesProvider>
    </PermissionsProvider>
  );
}
