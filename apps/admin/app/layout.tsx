import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ishoot Admin Portal — Workspace & Operations',
  description: 'Executive management portal for ishoot: CMS, CRM pipeline, invoices, payments, expenses, and financial intelligence.',
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
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
