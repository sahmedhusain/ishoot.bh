import crypto from "node:crypto";
import { serverMessages } from "@platform/locales";

function linkSecret() {
  const secret = process.env.CUSTOMER_AUTH_SECRET || process.env.REVALIDATION_SECRET;
  if (!secret) throw new Error(serverMessages.paymentGatewayUnavailable);
  return secret;
}
const linkSignature = (orderId: string) => crypto.createHmac("sha256", linkSecret()).update(`pay:${orderId}`).digest("base64url").slice(0, 32);

/** A link token that lets anyone holding it pay what is owed on this order (and nothing else). */
export const paymentLinkToken = (orderId: string) => `${orderId}.${linkSignature(orderId)}`;

/** The order a payment link is for, or null when the link was not made here. */
export function orderFromPaymentLink(token: string) {
  const [orderId, signature] = token.split(".");
  if (!orderId || !signature || !/^[0-9a-f-]{36}$/.test(orderId)) return null;
  const expected = linkSignature(orderId);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? orderId : null;
}
