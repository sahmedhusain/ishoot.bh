import { renderAccountSection } from "../../../../lib/account-page-data";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ signin?: string }>;
}) {
  const { locale } = await params;
  return renderAccountSection({
    locale,
    section: "profile",
    nextPath: `/${locale}/account/profile`,
    searchParams,
  });
}
