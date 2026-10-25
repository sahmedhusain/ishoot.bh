"use client";

import * as React from "react";
import type { CartQuote } from "@platform/database";
import type { CartLine } from "@platform/database/constants/store";

/** Prices the browser's cart on the server whenever it, the coupon or the fulfilment changes. */
export function useQuote(lines: CartLine[], couponCode: string, fulfilment: "delivery" | "pickup") {
  const [quote, setQuote] = React.useState<CartQuote | null>(null);
  const [loading, setLoading] = React.useState(true);
  const key = JSON.stringify([lines, couponCode, fulfilment]);
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    fetch("/api/store/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines, couponCode, fulfilment }) })
      .then((r) => r.json())
      .then((data: CartQuote) => live && setQuote(data))
      .catch(() => live && setQuote(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // The key holds everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { quote, loading };
}
