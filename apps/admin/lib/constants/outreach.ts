
export const CAMPAIGN_CHANNELS = [
  "social",
  "email",
  "ads",
  "whatsapp",
  "event",
  "print",
  "other",
] as const;
export const CAMPAIGN_STATUSES = [
  "planned",
  "running",
  "done",
  "cancelled",
] as const;
export const BROADCAST_STATUSES = ["draft", "sending", "sent"] as const;
export const COVERAGE_SENTIMENTS = ["positive", "neutral", "negative"] as const;
export const LEGAL_KINDS = [
  "dispute",
  "claim",
  "regulatory",
  "employment",
  "intellectual_property",
  "other",
] as const;
export const LEGAL_STATUSES = [
  "open",
  "in_progress",
  "on_hold",
  "closed",
] as const;

export function utmSlug(name: string) {
  return (
    name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "campaign"
  );
}
export const isUtmSlug = (value: string) =>
  /^[a-z0-9][a-z0-9_-]{1,59}$/.test(value);

export function trackedLink(
  url: string,
  params: {
    campaign: string;
    source: string;
    medium: string;
    content?: string;
  },
) {
  const target = new URL(url);
  target.searchParams.set("utm_campaign", params.campaign);
  if (params.source) target.searchParams.set("utm_source", params.source);
  if (params.medium) target.searchParams.set("utm_medium", params.medium);
  if (params.content) target.searchParams.set("utm_content", params.content);
  return target.toString();
}

export interface SegmentRules {
  minOrders?: number;
  minSpent?: number;
  orderedWithinDays?: number;
  notOrderedForDays?: number;
  city?: string;
}

export function matchesSegment(
  rules: SegmentRules,
  customer: {
    orders: number;
    spent: number;
    lastOrderAt: Date | null;
    cities: string[];
  },
  now = new Date(),
) {
  const days = customer.lastOrderAt
    ? (now.getTime() - customer.lastOrderAt.getTime()) / 86_400_000
    : Infinity;
  if (rules.minOrders != null && customer.orders < rules.minOrders)
    return false;
  if (rules.minSpent != null && customer.spent < rules.minSpent) return false;
  if (rules.orderedWithinDays != null && !(days <= rules.orderedWithinDays))
    return false;
  if (rules.notOrderedForDays != null && !(days >= rules.notOrderedForDays))
    return false;
  if (
    rules.city &&
    !customer.cities.some(
      (c) => c.trim().toLowerCase() === rules.city!.trim().toLowerCase(),
    )
  )
    return false;
  return true;
}

export const campaignReturn = (revenue: number, spend: number) =>
  spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null;
