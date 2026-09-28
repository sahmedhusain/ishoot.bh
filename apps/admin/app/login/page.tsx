import * as React from "react";
import { Metadata } from "next";
import { AdminLoginFormView } from "../../components/auth/AdminLoginFormView";
import { adminTranslations } from "../../lib/translations";

export const metadata: Metadata = {
  title: `${adminTranslations.en.loginView.title} | ${adminTranslations.en.brandName}`,
  description: adminTranslations.en.loginView.subtitle,
};

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#050807] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#09937F] border-t-transparent animate-spin" />
        </div>
      }
    >
      <AdminLoginFormView />
    </React.Suspense>
  );
}
