import { isPaymentGateway, type PaymentGatewayId } from "../constants/payments";
import { getActiveIntegrationCredentials } from "../queries/integrations";
import { paymentGateway } from "./gateways";

export async function activePaymentGateway() {
  const { getStoreSettings } = await import("../queries/store");
  const settings = await getStoreSettings().catch(() => null);
  const id = settings?.payment_gateway;
  if (!id || !isPaymentGateway(id)) return null;
  return gatewayWithCredentials(id);
}

export async function gatewayWithCredentials(id: PaymentGatewayId) {
  const credentials = await getActiveIntegrationCredentials(id);
  if (!credentials) return null;
  const gateway = paymentGateway(id);
  return { id, gateway, credentials, testMode: gateway.testMode(credentials) };
}
