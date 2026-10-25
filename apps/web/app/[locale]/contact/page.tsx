import { notFound } from "next/navigation";
import { getWebsite, isWebsitePreview } from "../../../lib/website";
import { ContactBody } from "../../../components/contact/ContactBody";
import { CmsPageView, findPage } from "../../../components/blocks/CmsPageView";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ intent?: string; service?: string; item?: string }>;
}) {
  const { locale } = await params;
  const [website, query, isPreview] = await Promise.all([getWebsite(), searchParams, isWebsitePreview()]);
  const contact = <ContactBody locale={locale} query={query} />;
  const page = findPage(website?.pages, { type: "contact" }, isPreview);
  if (page === null) notFound();
  if (page) return <CmsPageView page={page} locale={locale} contact={contact} />;
  // Websites published before pages existed.
  const pageVisible = website?.config?.pages?.find((p) => p.id === "contact")?.visible ?? true;
  if (!pageVisible && !isPreview) notFound();
  return contact;
}
