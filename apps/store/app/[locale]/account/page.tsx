import { notFound } from "next/navigation";
import { customerOrders, listCustomerAddresses, listWishlist } from "@platform/database";
import { requireSiteLanguage } from "../../../lib/site";
import { currentCustomer, signInProviders, accountsEnabled } from "../../../lib/customer";
import { AccountSignIn } from "../../../components/account/AccountSignIn";
import { AccountDashboard } from "../../../components/account/AccountDashboard";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ signin?: string; next?: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await accountsEnabled())) notFound();
  const [customer, query] = await Promise.all([currentCustomer(), searchParams]);
  if (!customer) return <AccountSignIn locale={locale} providers={await signInProviders()} notice={typeof query.signin === "string" ? query.signin : ""} next={typeof query.next === "string" ? query.next : ""} />;
  const [addresses, wishlist, orders] = await Promise.all([listCustomerAddresses(customer.id), listWishlist(customer.id), customerOrders(customer.id)]);
  return <AccountDashboard locale={locale} customer={customer} addresses={addresses} wishlist={wishlist} orders={orders} />;
}
