import { listTableRows } from "../api/tables";
import { isPaymentGateway, type PaymentGatewayId } from "../constants/payments";
import { getActiveIntegrationCredentials } from "../queries/integrations";
import { paymentGateway } from "./gateways";

export async function activePaymentGateway() {
  const rows = await listTableRows<any>("commerce", "store_settings");
  const settings = rows.find((r) => r.id === "default") ?? rows[0];
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
