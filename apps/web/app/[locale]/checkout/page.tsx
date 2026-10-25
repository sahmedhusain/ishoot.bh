import { notFound } from "next/navigation";
import { getStoreSettings, listCustomerAddresses } from "@platform/database";
import { getSite, requireSiteLanguage } from "../../../lib/site";
import { currentCustomer, storeEnabled } from "../../../lib/customer";
import { CheckoutView } from "../../../components/store/CheckoutView";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [settings, customer, { company }] = await Promise.all([getStoreSettings(), currentCustomer(), getSite()]);
  const addresses = customer ? await listCustomerAddresses(customer.id) : [];
  return (
    <CheckoutView
      locale={locale}
      settings={{ guestCheckout: settings.guest_checkout, delivery: settings.delivery_enabled, pickup: settings.pickup_enabled, cod: settings.cod_enabled, bankTransfer: settings.bank_transfer_enabled, bankInstructions: locale === "ar" ? settings.bank_instructions_ar || settings.bank_instructions_en : settings.bank_instructions_en || settings.bank_instructions_ar }}
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null}
      addresses={addresses}
      country={company.country ?? ""}
    />
  );
}
