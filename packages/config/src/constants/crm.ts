export interface DealStageConfig {
  value: string;
  translationKey: string;
  defaultProbability: number;
  colorClass: string;
}

export const DEAL_STAGES: DealStageConfig[] = [
  {
    value: "lead",
    translationKey: "crm.stages.lead",
    defaultProbability: 20,
    colorClass: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
  {
    value: "proposal_sent",
    translationKey: "crm.stages.proposalSent",
    defaultProbability: 40,
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    value: "contract_signed",
    translationKey: "crm.stages.contractSigned",
    defaultProbability: 70,
    colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    value: "production",
    translationKey: "crm.stages.production",
    defaultProbability: 80,
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    value: "post_production",
    translationKey: "crm.stages.postProduction",
    defaultProbability: 90,
    colorClass: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    value: "delivered",
    translationKey: "crm.stages.delivered",
    defaultProbability: 95,
    colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    value: "invoiced",
    translationKey: "crm.stages.invoiced",
    defaultProbability: 98,
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    value: "closed_won",
    translationKey: "crm.stages.closedWon",
    defaultProbability: 100,
    colorClass: "text-emerald-500 bg-emerald-500/15 border-emerald-500/30",
  },
  {
    value: "closed_lost",
    translationKey: "crm.stages.closedLost",
    defaultProbability: 0,
    colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
];

export interface ContactTypeConfig {
  value: "client" | "agency" | "vendor" | "freelancer";
  translationKey: string;
}

export const CONTACT_TYPES: ContactTypeConfig[] = [
  { value: "client", translationKey: "crm.contactTypes.client" },
  { value: "agency", translationKey: "crm.contactTypes.agency" },
  { value: "vendor", translationKey: "crm.contactTypes.vendor" },
  { value: "freelancer", translationKey: "crm.contactTypes.freelancer" },
];

export const INQUIRY_STATUSES = [
  { value: "new", translationKey: "crm.inquiryStatuses.new" },
  { value: "contacted", translationKey: "crm.inquiryStatuses.contacted" },
  { value: "qualified", translationKey: "crm.inquiryStatuses.qualified" },
  { value: "archived", translationKey: "crm.inquiryStatuses.archived" },
] as const;
