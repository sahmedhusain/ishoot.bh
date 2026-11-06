import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { ports } from "../../../playwright.config";

// A local stand-in for the few Stripe API calls the store makes (Checkout Sessions, refunds, balance), with a hosted
// "payment page" that, like Stripe, sends a signed webhook to the website and then returns the customer. The test
// servers point at it through PAYMENT_GATEWAY_BASE_URL_STRIPE (playwright.config.ts).

export const WEBHOOK_SECRET = "whsec_e2e_stand_in_secret";
const SECRET_KEY = "sk_test_e2e_stand_in";

interface Session {
  id: string;
  attempt: string;
  amount: number;
  currency: string;
  success: string;
  cancel: string;
  paid: boolean;
}

export interface StandIn {
  url: string;
  refunds: { payment_intent: string; amount: number }[];
  /** The last webhook body sent, to replay it. */
  lastWebhook: { body: string; signature: string } | null;
  sign(body: string): string;
  close(): Promise<void>;
}

export async function startStripeStandIn(webUrl: string): Promise<StandIn> {
  const sessions = new Map<string, Session>();
  const state: StandIn = {
    url: `http://localhost:${ports.stripe}`,
    refunds: [],
    lastWebhook: null,
    sign(body: string) {
      const t = Math.floor(Date.now() / 1000);
      return `t=${t},v1=${crypto.createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${body}`).digest("hex")}`;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
  const session = (s: Session) => ({
    id: s.id,
    object: "checkout.session",
    payment_status: s.paid ? "paid" : "unpaid",
    status: s.paid ? "complete" : "open",
    payment_intent: s.paid ? `pi_${s.id}` : null,
    amount_total: s.amount,
    currency: s.currency,
    client_reference_id: s.attempt,
    metadata: { attempt: s.attempt },
  });
  const read = (req: http.IncomingMessage) =>
    new Promise<string>((resolve) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => resolve(body));
    });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", state.url);
    const send = (status: number, body: unknown, type = "application/json") => {
      res.writeHead(status, { "Content-Type": type });
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    };
    if (
      req.headers.authorization &&
      req.headers.authorization !== `Bearer ${SECRET_KEY}`
    )
      return send(401, { error: { message: "Invalid API Key provided" } });
    if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const form = new URLSearchParams(await read(req));
      const id = `cs_test_${crypto.randomBytes(8).toString("hex")}`;
      const s: Session = {
        id,
        attempt: form.get("metadata[attempt]") ?? "",
        amount: Number(form.get("line_items[0][price_data][unit_amount]")),
        currency: form.get("line_items[0][price_data][currency]") ?? "",
        success: form.get("success_url") ?? "",
        cancel: form.get("cancel_url") ?? "",
        paid: false,
      };
      sessions.set(id, s);
      return send(200, { ...session(s), url: `${state.url}/pay/${id}` });
    }
    const sessionMatch = url.pathname.match(
      /^\/v1\/checkout\/sessions\/(cs_test_\w+)$/,
    );
    if (req.method === "GET" && sessionMatch) {
      const s = sessions.get(sessionMatch[1]);
      return s
        ? send(200, session(s))
        : send(404, { error: { message: "No such checkout.session" } });
    }
    if (req.method === "POST" && url.pathname === "/v1/refunds") {
      const form = new URLSearchParams(await read(req));
      state.refunds.push({
        payment_intent: form.get("payment_intent") ?? "",
        amount: Number(form.get("amount")),
      });
      return send(200, {
        id: `re_${crypto.randomBytes(6).toString("hex")}`,
        status: "succeeded",
      });
    }
    if (req.method === "GET" && url.pathname === "/v1/balance")
      return send(200, { object: "balance", livemode: false });
    const page = url.pathname.match(
      /^\/pay\/(cs_test_\w+)(\/(complete|cancel))?$/,
    );
    if (req.method === "GET" && page) {
      const s = sessions.get(page[1]);
      if (!s) return send(404, "Not found", "text/plain");
      if (page[3] === "cancel") {
        res.writeHead(303, { Location: s.cancel });
        return res.end();
      }
      if (page[3] === "complete") {
        s.paid = true;
        // Stripe tells the website before the customer gets back.
        const body = JSON.stringify({
          id: `evt_${crypto.randomBytes(8).toString("hex")}`,
          object: "event",
          type: "checkout.session.completed",
          data: { object: session(s) },
        });
        const signature = state.sign(body);
        state.lastWebhook = { body, signature };
        await fetch(`${webUrl}/api/store/payment/webhook/stripe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Stripe-Signature": signature,
          },
          body,
        });
        res.writeHead(303, {
          Location: s.success.replace("{CHECKOUT_SESSION_ID}", s.id),
        });
        return res.end();
      }
      return send(
        200,
        `<!doctype html><html><head><title>Stand-in checkout</title></head><body><h1>Test checkout</h1><p data-testid="standin-amount">${s.amount} ${s.currency}</p><a href="/pay/${s.id}/complete">Pay</a> <a href="/pay/${s.id}/cancel">Back</a></body></html>`,
        "text/html",
      );
    }
    send(404, { error: { message: "Unknown stand-in route" } });
  });
  await new Promise<void>((resolve) => server.listen(ports.stripe, resolve));
  return state;
}

import { setIntegration } from "./integrations";

/** Turns Stripe on in Integrations with the stand-in's keys and makes it the store's "Pay online" gateway. */
export async function useStripeStandIn(db: PrismaClient) {
  await setIntegration("stripe", true, {
    secretKey: SECRET_KEY,
    webhookSecret: WEBHOOK_SECRET,
  });
  await db.storeSettings.update({
    where: { id: "default" },
    data: { paymentGateway: "stripe" },
  });
}
