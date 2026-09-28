export interface PaymentMethodConfig {
  value: "bank_transfer" | "cash" | "cheque" | "card" | "online";
  translationKey: string;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { value: "bank_transfer", translationKey: "finance.paymentMethods.bankTransfer" },
  { value: "cash", translationKey: "finance.paymentMethods.cash" },
  { value: "cheque", translationKey: "finance.paymentMethods.cheque" },
  { value: "card", translationKey: "finance.paymentMethods.card" },
  { value: "online", translationKey: "finance.paymentMethods.online" },
];

export interface InvoiceStatusConfig {
  value: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";
  translationKey: string;
  colorClass: string;
}

export const INVOICE_STATUSES: InvoiceStatusConfig[] = [
  { value: "draft", translationKey: "finance.invoiceStatuses.draft", colorClass: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  { value: "sent", translationKey: "finance.invoiceStatuses.sent", colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { value: "partially_paid", translationKey: "finance.invoiceStatuses.partiallyPaid", colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "paid", translationKey: "finance.invoiceStatuses.paid", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { value: "overdue", translationKey: "finance.invoiceStatuses.overdue", colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { value: "void", translationKey: "finance.invoiceStatuses.void", colorClass: "text-slate-500 bg-slate-500/5 border-slate-500/10" },
];

export interface DiscountTypeConfig {
  value: "none" | "percentage" | "fixed";
  translationKey: string;
}

export const DISCOUNT_TYPES: DiscountTypeConfig[] = [
  { value: "none", translationKey: "finance.discountTypes.none" },
  { value: "percentage", translationKey: "finance.discountTypes.percentage" },
  { value: "fixed", translationKey: "finance.discountTypes.fixed" },
];

export interface DeliveryChannelConfig {
  value: "email" | "whatsapp" | "print" | "download";
  translationKey: string;
}

export const DELIVERY_CHANNELS: DeliveryChannelConfig[] = [
  { value: "email", translationKey: "finance.deliveryChannels.email" },
  { value: "whatsapp", translationKey: "finance.deliveryChannels.whatsapp" },
  { value: "print", translationKey: "finance.deliveryChannels.print" },
  { value: "download", translationKey: "finance.deliveryChannels.download" },
];
