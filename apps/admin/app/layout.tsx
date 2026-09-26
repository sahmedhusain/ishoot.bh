import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ishoot Admin Portal — Workspace & Operations',
  description: 'Executive management portal for ishoot: CMS, Twenty-style CRM pipeline, invoices, payments, expenses, and financial intelligence.',
  icons: {
    icon: '/images/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050807] text-[#F2F6F5] antialiased">
        {children}
      </body>
    </html>
  );
}
