import { db } from "../atomic";
import { isPaymentGateway, type PaymentGatewayId } from "../constants/payments";
import { getActiveIntegrationCredentials } from "../queries/integrations";
import { paymentGateway } from "./gateways";

export async function activePaymentGateway() {
  const settings = await db.storeSettings.findUnique({
    where: { id: "default" },
    select: { paymentGateway: true },
  });
  const id = settings?.paymentGateway;
  if (!id || !isPaymentGateway(id)) return null;
  return gatewayWithCredentials(id);
}

export async function gatewayWithCredentials(id: PaymentGatewayId) {
  const credentials = await getActiveIntegrationCredentials(id);
  if (!credentials) return null;
  const gateway = paymentGateway(id);
  return { id, gateway, credentials, testMode: gateway.testMode(credentials) };
}
