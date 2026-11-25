import { notFound, redirect } from "next/navigation";
import { getSite, requireSiteLanguage } from "../../../lib/site";
import { pickText } from "@platform/database/constants/languages";
import { AccountSignIn } from "../../../components/account/AccountSignIn";
import { accountsEnabled, currentCustomer, signInProviders } from "../../../lib/customer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { company } = await getSite();
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const label = locale === "ar" ? "استعادة الدخول" : "Account Recovery & One-Time Sign In";
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await accountsEnabled())) notFound();
  const existing = await currentCustomer().catch(() => null);
  if (existing) {
    redirect(`/${locale}/account`);
  }
  return (
    <AccountSignIn
      locale={locale}
      providers={await signInProviders()}
      notice=""
      next={`/${locale}/account`}
      initialTab="code"
    />
  );
}
