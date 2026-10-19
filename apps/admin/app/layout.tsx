import "./globals.css";
import { companyMetadata } from "../lib/company-metadata";
import { AdminLocaleProvider } from "../hooks/useAdminLocale";
import { AdminThemeProvider } from "../hooks/useAdminTheme";
import { Toaster } from "sonner";

export const generateMetadata = () => companyMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="min-h-screen bg-[#F4F8F7] text-slate-800 dark:bg-[#080E0D] dark:text-ink antialiased font-sans selection:bg-accent/30 selection:text-white transition-colors duration-200">
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
