import { permanentRedirect } from "next/navigation";
import { getSite, requireSiteLanguage } from "../../../lib/site";

export const dynamic = "force-dynamic";

export default async function ArticlesRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  const { info } = await getSite();
  const targetSlug = info.articles.slug && info.articles.slug !== "articles" ? info.articles.slug : "news";
  permanentRedirect(`/${locale}/${targetSlug}`);
}
