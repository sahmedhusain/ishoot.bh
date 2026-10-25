import { notFound } from "next/navigation";
import { listCustomerAddresses, listWishlist } from "@platform/database";
import { requireSiteLanguage } from "../../../lib/site";
import { currentCustomer, signInProviders, storeEnabled } from "../../../lib/customer";
import { AccountSignIn } from "../../../components/account/AccountSignIn";
import { AccountDashboard } from "../../../components/account/AccountDashboard";

export const dynamic = "force-dynamic";

/** The customer's account: sign in or create one, then profile, addresses, orders and wishlist. */
export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ signin?: string; next?: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [customer, query] = await Promise.all([currentCustomer(), searchParams]);
  if (!customer) return <AccountSignIn locale={locale} providers={await signInProviders()} notice={typeof query.signin === "string" ? query.signin : ""} next={typeof query.next === "string" ? query.next : ""} />;
  const [addresses, wishlist] = await Promise.all([listCustomerAddresses(customer.id), listWishlist(customer.id)]);
  return <AccountDashboard locale={locale} customer={customer} addresses={addresses} wishlist={wishlist} />;
}
