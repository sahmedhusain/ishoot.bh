import { renderAccountSection } from "../../../../lib/account-page-data";

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ signin?: string }>;
}) {
  const { locale } = await params;
  return renderAccountSection({
    locale,
    section: "addresses",
    nextPath: `/${locale}/account/addresses`,
    searchParams,
  });
}
