import * as React from "react";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/session";
import { getCompanyBranding } from "../../../lib/company-branding";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (await currentUser()) redirect("/");
  const branding = await getCompanyBranding();
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-[#f4f6f8] dark:bg-[#0b1320]">
      <React.Suspense fallback={<div className="w-full max-w-md h-96 rounded-xl bg-white dark:bg-[#141f32] animate-pulse" />}>
        <ResetPasswordForm branding={branding} />
      </React.Suspense>
    </main>
  );
}
