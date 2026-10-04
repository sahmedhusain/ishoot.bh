// CRM pipeline rules shared by queries and the UI. Runtime-free.

/** Pipeline order. Closed stages come last; a deal only ever auto-advances forward through this list. */
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

export const CLOSED_DEAL_STAGES: readonly DealStageValue[] = ["closed_won", "closed_lost"];

/** The single definition of an "active" deal: anything still in the pipeline (not won or lost). */
export const ACTIVE_DEAL_STAGES: readonly DealStageValue[] = DEAL_STAGE_ORDER.filter(
  (stage) => !CLOSED_DEAL_STAGES.includes(stage),
);

export const isActiveDealStage = (stage: string) => !(CLOSED_DEAL_STAGES as readonly string[]).includes(stage);

/** Stages a deal may be auto-advanced from to reach `target`: every open stage before it. */
export const dealStagesBefore = (target: DealStageValue): DealStageValue[] =>
  ACTIVE_DEAL_STAGES.slice(0, Math.max(0, DEAL_STAGE_ORDER.indexOf(target)));

/** Win probability a deal takes when it is auto-advanced into a stage (matches the pipeline board defaults). */
export const DEAL_STAGE_PROBABILITY: Record<DealStageValue, number> = {
  lead: 20,
  proposal_sent: 40,
  contract_signed: 70,
  production: 80,
  post_production: 90,
  delivered: 95,
  invoiced: 98,
  closed_won: 100,
  closed_lost: 0,
};

/** Business events that move a linked deal forward. */
export const DEAL_STAGE_ON_EVENT = {
  quotation_issued: "proposal_sent",
  quotation_accepted: "contract_signed",
  invoice_issued: "invoiced",
  invoice_paid: "closed_won",
} as const satisfies Record<string, DealStageValue>;
export type DealProgressEvent = keyof typeof DEAL_STAGE_ON_EVENT;
