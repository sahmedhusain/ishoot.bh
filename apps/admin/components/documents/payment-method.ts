import type { PaymentMethod } from "@platform/database/types";
import type { useAdminLocale } from "../../hooks/useAdminLocale";

type AdminCopy = ReturnType<typeof useAdminLocale>["t"];

export function paymentMethodLabel(method: PaymentMethod | string, t: AdminCopy): string {
  const labels: Record<string, string> = {
    bank_transfer: t.finance.bankTransfer,
    cash: t.finance.cash,
    cheque: t.finance.cheque,
    card: t.finance.card,
    online: t.finance.online,
  };
  return labels[method] ?? method.replaceAll("_", " ");
}
