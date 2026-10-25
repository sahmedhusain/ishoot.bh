"use client";

import * as React from "react";
import type { CartQuote } from "@platform/database";
import type { CartLine } from "@platform/database/constants/store";

/**
 * Prices the browser's cart on the server whenever it, the coupon, the fulfilment or the delivery area changes
 * (the area picks the delivery zone's fee). Typing an address waits for a pause before asking again.
 */
export function useQuote(lines: CartLine[], couponCode: string, fulfilment: "delivery" | "pickup", place?: { area: string; city: string }) {
  const [quote, setQuote] = React.useState<CartQuote | null>(null);
  const [loading, setLoading] = React.useState(true);
  const key = JSON.stringify([lines, couponCode, fulfilment, place?.area.trim(), place?.city.trim()]);
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch("/api/store/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines, couponCode, fulfilment, address: place ?? null }) })
        .then((r) => r.json())
        .then((data: CartQuote) => live && setQuote(data))
        .catch(() => live && setQuote(null))
        .finally(() => live && setLoading(false));
    }, place ? 350 : 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // The key holds everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { quote, loading };
}
