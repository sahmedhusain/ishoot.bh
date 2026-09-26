import './globals.css';
import type { Metadata } from 'next';
import { AdminLocaleProvider } from '../hooks/useAdminLocale';

export const metadata: Metadata = {
  title: 'ishoot — لوحة العمليات والتحكم الإداري | Executive Operations',
  description: 'Enterprise operations portal for ishoot Cinema Production House.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[#050807] text-[#F2F6F5] antialiased font-sans selection:bg-[#09937F]/30 selection:text-white">
        <AdminLocaleProvider>
          {children}
        </AdminLocaleProvider>
      </body>
    </html>
  );
}
