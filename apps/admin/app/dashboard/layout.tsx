import * as React from "react";
import { Sidebar } from "../../components/layout/Sidebar";
import { Topbar } from "../../components/layout/Topbar";
import { SidebarProvider } from "../../components/layout/SidebarContext";
import { getCompanySettings, getFeatureToggles } from "@ishoot/database";
import { requireAuth } from "../../lib/auth";
import { FeatureTogglesProvider } from "../../hooks/useFeatureToggles";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const [company, toggles] = await Promise.all([
    getCompanySettings(),
    getFeatureToggles(),
  ]);

  return (
    <FeatureTogglesProvider initialFeatures={toggles}>
      <SidebarProvider>
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F8FAF9] text-slate-800 dark:bg-[#080E0D] dark:text-[#F2F6F5] transition-colors duration-200">
          {/* Fixed Topbar spanning full width with Logo at start */}
          <Topbar company={{ company_name_en: company.company_name_en, company_name_ar: company.company_name_ar, logo_url: company.logo_url, dark_logo_url: company.dark_logo_url, icon_url: company.icon_url, dark_icon_url: company.dark_icon_url }} />

          {/* Workspace below Topbar: Sidebar (fixed on side) + Main Content (scrolls independently) */}
          <div className="flex-1 flex min-h-0 pt-14 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </FeatureTogglesProvider>
  );
}
