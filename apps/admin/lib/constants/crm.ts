// CRM pipeline rules shared by queries and the UI. Runtime-free.
// Each company keeps its own stage list (DealPipelineStage); these are the built-in stages and their defaults.

/** The stages a new install starts with, in pipeline order. Closed stages come last. */
export const DEAL_STAGE_ORDER = [
  "lead",
  "proposal_sent",
  "contract_signed",
  "production",
  "post_production",
  "delivered",
  "invoiced",
  "closed_won",
  "closed_lost",
] as const;
export type DealStageValue = (typeof DEAL_STAGE_ORDER)[number];

/** Stages quotations, invoices and payments move deals into: they can be renamed and reordered, not removed. */
export const SYSTEM_DEAL_STAGES = [
  "lead",
  "proposal_sent",
  "contract_signed",
  "invoiced",
  "closed_won",
  "closed_lost",
] as const;
export type SystemDealStage = (typeof SYSTEM_DEAL_STAGES)[number];
export const isSystemDealStage = (stage: string): stage is SystemDealStage =>
  (SYSTEM_DEAL_STAGES as readonly string[]).includes(stage);

/** Stages with a built-in label in the admin copy (`stages.<id>`), offered when a company builds its pipeline. */
export const BUILT_IN_DEAL_STAGES = [
  ...DEAL_STAGE_ORDER,
  "scheduled",
  "processing",
  "shipped",
  "viewing",
  "negotiation",
] as const;
export type BuiltInDealStage = (typeof BUILT_IN_DEAL_STAGES)[number];
export const isBuiltInDealStage = (stage: string): stage is BuiltInDealStage =>
  (BUILT_IN_DEAL_STAGES as readonly string[]).includes(stage);

export const CLOSED_DEAL_STAGES: readonly DealStageValue[] = [
  "closed_won",
  "closed_lost",
];

/** The single definition of an "active" deal: anything still in the pipeline (not won or lost). */
export const ACTIVE_DEAL_STAGES: readonly DealStageValue[] =
  DEAL_STAGE_ORDER.filter((stage) => !CLOSED_DEAL_STAGES.includes(stage));

export const isActiveDealStage = (stage: string) =>
  !(CLOSED_DEAL_STAGES as readonly string[]).includes(stage);

/** Default win probability and board colour of each built-in stage. */
export const DEAL_STAGE_DEFAULTS: Record<
  BuiltInDealStage,
  { probability: number; color: string | null }
> = {
  lead: { probability: 20, color: "#3B82F6" },
  proposal_sent: { probability: 40, color: "#F59E0B" },
  contract_signed: { probability: 70, color: "#8B5CF6" },
  scheduled: { probability: 75, color: "#6366F1" },
  viewing: { probability: 50, color: "#0EA5E9" },
  negotiation: { probability: 60, color: "#F97316" },
  processing: { probability: 80, color: "#F59E0B" },
  production: { probability: 80, color: null },
  shipped: { probability: 90, color: "#A855F7" },
  post_production: { probability: 90, color: "#A855F7" },
  delivered: { probability: 95, color: "#10B981" },
  invoiced: { probability: 98, color: "#0D9488" },
  closed_won: { probability: 100, color: "#059669" },
  closed_lost: { probability: 0, color: "#E11D48" },
};

/**
 * The working stages between "contract signed" and "invoiced" for each business activity
 * (website-presets.ts BUSINESS_ACTIVITIES). The system stages frame them.
 */
export const ACTIVITY_DEAL_STAGES: Record<string, readonly BuiltInDealStage[]> =
  {
    media: ["production", "post_production", "delivered"],
    agency: ["production", "post_production", "delivered"],
    products: ["processing", "shipped", "delivered"],
    food: ["processing", "delivered"],
    services: ["scheduled", "production", "delivered"],
    real_estate: ["viewing", "negotiation"],
    construction: ["scheduled", "production", "post_production", "delivered"],
    education: ["scheduled", "production", "delivered"],
    healthcare: ["scheduled", "production", "delivered"],
    events: ["scheduled", "production", "delivered"],
    online_store: ["processing", "shipped", "delivered"],
    beauty: ["scheduled", "delivered"],
    fitness: ["scheduled", "delivered"],
    automotive: ["scheduled", "production", "delivered"],
    logistics: ["scheduled", "shipped", "delivered"],
    travel: ["scheduled", "delivered"],
    hotel: ["scheduled", "delivered"],
    law_firm: ["production", "post_production", "delivered"],
    nonprofit: ["production", "delivered"],
    pharmacy: ["processing", "delivered"],
    manufacturing: ["processing", "production", "shipped", "delivered"],
    it_software: ["production", "post_production", "delivered"],
    other: ["production", "delivered"],
  };

/** The full stage list an activity starts with, in pipeline order. */
export function activityDealStages(
  activity: string | null | undefined,
): BuiltInDealStage[] {
  const middle =
    ACTIVITY_DEAL_STAGES[activity ?? ""] ??
    ACTIVITY_DEAL_STAGES.services ??
    ACTIVITY_DEAL_STAGES.other;
  return [
    "lead",
    "proposal_sent",
    "contract_signed",
    ...middle,
    "invoiced",
    "closed_won",
    "closed_lost",
  ];
}

/** Business events that move a linked deal forward. */
export const DEAL_STAGE_ON_EVENT = {
  quotation_issued: "proposal_sent",
  quotation_accepted: "contract_signed",
  invoice_issued: "invoiced",
  invoice_paid: "closed_won",
} as const satisfies Record<string, SystemDealStage>;
export type DealProgressEvent = keyof typeof DEAL_STAGE_ON_EVENT;

/** A custom stage id: lower-case words joined by underscores. */
export const DEAL_STAGE_ID = /^[a-z][a-z0-9_]{1,39}$/;
