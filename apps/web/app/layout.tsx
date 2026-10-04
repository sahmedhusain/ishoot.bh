import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getTranslations } from "@ishoot/locales";

const { seo } = getTranslations("en");

export const metadata: Metadata = {
  metadataBase: new URL(process.env.WEB_URL || "https://ishoot.bh"),
  title: seo.title,
  description: seo.description,
  icons: {
    icon: "/brand/icon-dark.svg",
    shortcut: "/brand/icon-dark.svg",
    apple: "/brand/icon-dark.svg",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://ishoot.bh",
    siteName: "ishoot.bh",
    images: [
      {
        url: "/images/logo-full.png",
        width: 1200,
        height: 630,
        alt: seo.imageAlt,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#014842",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
