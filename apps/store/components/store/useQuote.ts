"use client";

import * as React from "react";
import type { CartQuote } from "@platform/database";
import type { CartLine } from "@platform/database/constants/store";

export function useQuote(
  lines: CartLine[],
  couponCode: string,
  fulfilment: "delivery" | "pickup",
  place?: { area: string; city: string },
) {
  const [quote, setQuote] = React.useState<CartQuote | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const retry = React.useCallback(() => setAttempt(value => value + 1), []);
  const key = JSON.stringify([
    lines,
    couponCode,
    fulfilment,
    place?.area.trim(),
    place?.city.trim(),
    attempt,
  ]);
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);
    const timer = setTimeout(
      () => {
        fetch("/api/store/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines,
            couponCode,
            fulfilment,
            address: place ?? null,
          }),
        })
          .then((r) => { if (!r.ok) throw new Error("quote_unavailable"); return r.json(); })
          .then((data: CartQuote) => live && setQuote(data))
          .catch(() => { if (live) { setQuote(null); setFailed(true); } })
          .finally(() => live && setLoading(false));
      },
      place ? 350 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key]);
  return { quote, loading, failed, retry };
}
