import { renderAccountSection } from "../../../lib/account-page-data";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ signin?: string }>;
}) {
  const { locale } = await params;
  return renderAccountSection({
    locale,
    section: "all",
    nextPath: `/${locale}/account`,
    searchParams,
  });
}
