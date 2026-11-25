import * as React from "react";
import { notFound } from "next/navigation";
import {
  customerOrders,
  getStoreSettings,
  listCustomerAddresses,
  listCustomerPointsTransactions,
  listCustomerReturnRequests,
  listCustomerWalletTransactions,
  listWishlist,
} from "@platform/database";
import { requireSiteLanguage } from "./site";
import { accountsEnabled, currentCustomer, signInProviders } from "./customer";
import { AccountSignIn } from "../components/account/AccountSignIn";
import {
  AccountDashboard,
  type AccountSection,
} from "../components/account/AccountDashboard";

export async function loadAccountPortalData(locale: string) {
  await requireSiteLanguage(locale);
  if (!(await accountsEnabled())) notFound();

  const customer = await currentCustomer();
  if (!customer) {
    return {
      customer: null as null,
      providers: await signInProviders(),
    };
  }

  const [
    addresses,
    wishlist,
    orders,
    walletTransactions,
    pointsTransactions,
    returnRequests,
    storeSettings,
  ] = await Promise.all([
    listCustomerAddresses(customer.id),
    listWishlist(customer.id),
    customerOrders(customer.id),
    listCustomerWalletTransactions(customer.id).catch(() => []),
    listCustomerPointsTransactions(customer.id).catch(() => []),
    listCustomerReturnRequests(customer.id).catch(() => []),
    getStoreSettings().catch(() => null),
  ]);

  return {
    customer,
    addresses,
    wishlist,
    orders,
    walletTransactions,
    pointsTransactions,
    returnRequests,
    pointsRedemptionRate: storeSettings?.points_redemption_rate ?? 500,
    minRedeemPoints: storeSettings?.min_redeem_points ?? 1000,
  };
}

export async function renderAccountSection({
  locale,
  section,
  nextPath,
  searchParams,
}: {
  locale: string;
  section: AccountSection;
  nextPath: string;
  searchParams: Promise<{ signin?: string }>;
}) {
  const [data, query] = await Promise.all([
    loadAccountPortalData(locale),
    searchParams,
  ]);
  const notice = typeof query.signin === "string" ? query.signin : "";

  if (!data.customer) {
    return (
      <AccountSignIn
        locale={locale}
        providers={data.providers}
        notice={notice}
        next={nextPath}
      />
    );
  }

  return (
    <AccountDashboard
      locale={locale}
      customer={data.customer}
      addresses={data.addresses}
      wishlist={data.wishlist}
      orders={data.orders}
      walletTransactions={data.walletTransactions}
      pointsTransactions={data.pointsTransactions}
      returnRequests={data.returnRequests}
      pointsRedemptionRate={data.pointsRedemptionRate}
      minRedeemPoints={data.minRedeemPoints}
      activeSection={section}
    />
  );
}
