import { pickupAvailable } from "@platform/database/constants/website-commerce";
import { notFound } from "next/navigation";
import { getStoreSettings, listCustomerAddresses, onlinePaymentAvailable } from "@platform/database";
import { getSite, requireSiteLanguage } from "../../../lib/site";
import { currentCustomer, orderingEnabled } from "../../../lib/customer";
import { CheckoutView } from "../../../components/store/CheckoutView";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await orderingEnabled())) notFound();
  const [settings, customer, { company, config }, online] = await Promise.all([getStoreSettings(), currentCustomer(), getSite(), onlinePaymentAvailable()]);
  if (!config.commerce.capabilities.ordering) notFound();
  const addresses = customer ? await listCustomerAddresses(customer.id) : [];
  return (
    <CheckoutView
      locale={locale}
      settings={{
        guestCheckout: settings.guest_checkout,
        delivery: settings.delivery_enabled && config.commerce.capabilities.delivery,
        pickup: settings.pickup_enabled && pickupAvailable(config.commerce),
        cod: settings.cod_enabled,
        online,
        bankTransfer: settings.bank_transfer_enabled,
        bankInstructions: locale === "ar" ? settings.bank_instructions_ar || settings.bank_instructions_en : settings.bank_instructions_en || settings.bank_instructions_ar,
        loyaltyEnabled: settings.loyalty_enabled,
        walletEnabled: settings.wallet_enabled,
        pointsRedemptionRate: settings.points_redemption_rate,
        minRedeemPoints: settings.min_redeem_points,
      }}
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null}
      rewards={customer ? { loyaltyPoints: customer.loyalty_points ?? 0, walletBalance: customer.wallet_balance ?? 0, discountPercent: customer.discount_percent ?? 0 } : null}
      addresses={addresses}
      country={company.country ?? ""}
      branches={config.commerce.branches}
      accountsEnabled={config.commerce.capabilities.accounts}
      collectCoordinates={config.commerce.collectCoordinates === true}
    />
  );
}
