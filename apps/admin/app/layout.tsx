import "./globals.css";
import type { Metadata } from "next";
import { AdminLocaleProvider } from "../hooks/useAdminLocale";
import { AdminThemeProvider } from "../hooks/useAdminTheme";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ishoot | Enterprise Operations Portal",
  description:
    "Enterprise operations portal for ishoot Cinema Production House.",
  icons: {
    icon: "/brand/icon-dark.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="min-h-screen bg-[#F8FAF9] text-slate-800 dark:bg-[#080E0D] dark:text-[#F2F6F5] antialiased font-sans selection:bg-[#09937F]/30 selection:text-white transition-colors duration-200">
        <AdminThemeProvider>
          <AdminLocaleProvider>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </AdminLocaleProvider>
        </AdminThemeProvider>
      </body>
    </html>
  );
}
