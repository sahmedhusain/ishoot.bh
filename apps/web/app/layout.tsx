import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getTranslations, formatMessage } from "@ishoot/locales";
import { getPublicCompanySettings } from "../lib/company";
import { publicSiteUrl } from "../lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const [company, metadataBase] = await Promise.all([
    getPublicCompanySettings(),
    publicSiteUrl(),
  ]);
  const { seo } = getTranslations("en");
  const values = { companyName: company.company_name_en };
  const title = formatMessage(seo.title, values);
  return {
    metadataBase,
    title,
    description: seo.description,
    ...(company.icon_url ? { icons: { icon: company.icon_url } } : {}),
    openGraph: {
      title,
      description: seo.description,
      url: metadataBase.href,
      siteName: company.company_name_en,
      images: company.logo_url
        ? [{ url: company.logo_url, alt: formatMessage(seo.imageAlt, values) }]
        : [],
      locale: "en_US",
      type: "website",
    },
  };
}

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
