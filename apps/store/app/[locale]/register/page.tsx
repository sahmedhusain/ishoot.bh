import { notFound, redirect } from "next/navigation";
import { requireSiteLanguage } from "../../../lib/site";
import { currentCustomer, signInProviders, accountsEnabled } from "../../../lib/customer";
import { AccountSignIn } from "../../../components/account/AccountSignIn";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ signin?: string; next?: string }>;
}) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await accountsEnabled())) notFound();
  const [customer, query] = await Promise.all([currentCustomer(), searchParams]);
  const nextUrl = typeof query.next === "string" && query.next.startsWith("/") ? query.next : `/${locale}/account`;
  if (customer) redirect(nextUrl);

  return (
    <AccountSignIn
      locale={locale}
      providers={await signInProviders()}
      notice={typeof query.signin === "string" ? query.signin : ""}
      next={typeof query.next === "string" ? query.next : ""}
      initialTab="signUp"
    />
  );
}
