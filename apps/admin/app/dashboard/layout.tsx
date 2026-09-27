import * as React from "react";
import { Sidebar } from "../../components/layout/Sidebar";
import { Topbar } from "../../components/layout/Topbar";
import { getCRMContacts } from "@ishoot/database";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const contacts = await getCRMContacts();

  return (
    <div className="flex min-h-screen bg-[#F8FAF9] text-slate-800 dark:bg-[#080E0D] dark:text-[#F2F6F5] transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar contacts={contacts} />
        <main className="flex-1 p-5 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
