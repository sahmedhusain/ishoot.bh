import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'ishoot — Cinema Production House | دار الإنتاج السينمائي',
  description: 'High-end commercial cinematography, aerial drone capture, DaVinci Resolve color grading, and creative studio productions based in Bahrain.',
  icons: {
    icon: '/images/icon.svg',
    shortcut: '/images/icon.svg',
    apple: '/images/icon.svg',
  },
  openGraph: {
    title: 'ishoot — Cinema Production House',
    description: 'Cinema in every frame. High-end commercial cinematography & studio productions in Bahrain.',
    url: 'https://ishoot.bh',
    siteName: 'ishoot.bh',
    images: [
      {
        url: '/images/logo-full.png',
        width: 1200,
        height: 630,
        alt: 'ishoot Cinema Production',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#014842',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
