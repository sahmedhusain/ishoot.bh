"use client";

import * as React from "react";
import { CART_STORAGE_KEY, MAX_CART_LINES, MAX_LINE_QUANTITY, type CartLine } from "@platform/database/constants/store";

const EVENT = "platform-cart-change";

/** The cart in this browser (product, variant, quantity only: prices come from the server). */
function readCart(): CartLine[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((l) => l && typeof l.productId === "string" && Number(l.quantity) > 0).slice(0, MAX_CART_LINES) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines.slice(0, MAX_CART_LINES)));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function addToCart(line: CartLine) {
  const lines = readCart();
  const same = lines.find((l) => l.productId === line.productId && (l.variantId ?? "") === (line.variantId ?? ""));
  if (same) same.quantity = Math.min(MAX_LINE_QUANTITY, same.quantity + line.quantity);
  else lines.push({ ...line, quantity: Math.min(MAX_LINE_QUANTITY, line.quantity) });
  writeCart(lines);
}

/** The cart, kept in step across components and tabs. */
export function useCart() {
  const [lines, setLines] = React.useState<CartLine[]>([]);
  React.useEffect(() => {
    const update = () => setLines(readCart());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return lines;
}
