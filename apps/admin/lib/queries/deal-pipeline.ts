import { serverMessages } from "@platform/locales";
import { listDeals } from "@platform/api-client";
import {
  DEAL_STAGE_DEFAULTS,
  DEAL_STAGE_ID,
  DEAL_STAGE_ORDER,
  SYSTEM_DEAL_STAGES,
  activityDealStages,
  isBuiltInDealStage,
  isSystemDealStage,
} from "../constants/crm";

export interface DealPipelineStage {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  sort_order: number;
  probability: number;
  kind: "open" | "won" | "lost";
  color: string | null;
  is_system: boolean;
  is_active: boolean;
  deal_count: number;
}

type StageRow = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  sortOrder: number;
  probability: number;
  kind: string;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
};

const mapStage = (row: StageRow, count = 0): DealPipelineStage => ({
  id: row.id,
  name_en: row.nameEn,
  name_ar: row.nameAr,
  sort_order: row.sortOrder,
  probability: row.probability,
  kind: row.kind === "won" || row.kind === "lost" ? row.kind : "open",
  color: row.color,
  is_system: row.isSystem,
  is_active: row.isActive,
  deal_count: count,
});

const builtInRow = (id: string, sortOrder: number): StageRow => ({
  id,
  nameEn: null,
  nameAr: null,
  sortOrder,
  probability: isBuiltInDealStage(id)
    ? DEAL_STAGE_DEFAULTS[id].probability
    : 50,
  color: isBuiltInDealStage(id) ? DEAL_STAGE_DEFAULTS[id].color : null,
  kind: id === "closed_won" ? "won" : id === "closed_lost" ? "lost" : "open",
  isSystem: isSystemDealStage(id),
  isActive: true,
});

let pipelineStagesStore: StageRow[] = DEAL_STAGE_ORDER.map((id, index) =>
  builtInRow(id, index),
);

export async function getDealPipeline(): Promise<DealPipelineStage[]> {
  const deals = await listDeals().catch(() => []);
  const byStage = new Map<string, number>();
  for (const d of deals || []) {
    const stage = d.stage || "lead";
    byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
  }

  const rows = [...pipelineStagesStore].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return rows.map((row) => mapStage(row, byStage.get(row.id) ?? 0));
}

export async function getActiveDealStages(): Promise<DealPipelineStage[]> {
  return (await getDealPipeline()).filter(
    (stage) => stage.is_active || stage.deal_count > 0,
  );
}

export async function assertDealStage(stage: string) {
  const pipeline = await getDealPipeline();
  const found = pipeline.find((s) => s.id === stage);
  if (!found?.is_active) throw new Error(serverMessages.dealStageInvalid);
}

export interface DealPipelineStageInput {
  id: string;
  name_en: string;
  name_ar: string;
  probability: number;
  color: string;
  is_active: boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function saveDealPipeline(stages: DealPipelineStageInput[]) {
  const ids = stages.map((stage) => stage.id);
  if (new Set(ids).size !== ids.length || stages.length > 30)
    throw new Error(serverMessages.dealStageInvalid);
  for (const stage of stages) {
    if (!DEAL_STAGE_ID.test(stage.id))
      throw new Error(serverMessages.dealStageInvalid);
    if (
      !Number.isInteger(stage.probability) ||
      stage.probability < 0 ||
      stage.probability > 100
    )
      throw new Error(serverMessages.dealStageInvalid);
    if (stage.color && !HEX.test(stage.color))
      throw new Error(serverMessages.dealStageInvalid);
    if (stage.name_en.length > 60 || stage.name_ar.length > 60)
      throw new Error(serverMessages.dealStageInvalid);
    if (
      !isBuiltInDealStage(stage.id) &&
      !stage.name_en.trim() &&
      !stage.name_ar.trim()
    )
      throw new Error(serverMessages.dealStageNameRequired);
  }
  for (const id of SYSTEM_DEAL_STAGES) {
    const stage = stages.find((s) => s.id === id);
    if (!stage || !stage.is_active)
      throw new Error(serverMessages.dealStageSystemRequired);
  }
  const open = stages.filter(
    (s) => s.id !== "closed_won" && s.id !== "closed_lost",
  );
  const ordered = [
    ...open,
    stages.find((s) => s.id === "closed_won")!,
    stages.find((s) => s.id === "closed_lost")!,
  ];
  const current = await getDealPipeline();
  for (const stage of current) {
    const next = stages.find((s) => s.id === stage.id);
    if (stage.deal_count > 0 && (!next || !next.is_active))
      throw new Error(serverMessages.dealStageInUse);
  }

  pipelineStagesStore = ordered.map((stage, index) => ({
    id: stage.id,
    nameEn: stage.name_en.trim() || null,
    nameAr: stage.name_ar.trim() || null,
    sortOrder: index,
    probability: stage.probability,
    color: stage.color || null,
    isActive: stage.is_active,
    kind:
      stage.id === "closed_won"
        ? "won"
        : stage.id === "closed_lost"
          ? "lost"
          : "open",
    isSystem: isSystemDealStage(stage.id),
  }));

  return getDealPipeline();
}

export async function applyActivityDealPipeline(
  activity: string | null | undefined,
) {
  const wanted: string[] = activityDealStages(activity);
  const current = await getDealPipeline();
  const inUse = current
    .filter((stage) => !wanted.includes(stage.id) && stage.deal_count > 0)
    .map((stage) => stage.id);
  const invoiced = wanted.indexOf("invoiced");
  const order = [
    ...wanted.slice(0, invoiced),
    ...inUse,
    ...wanted.slice(invoiced),
  ];

  pipelineStagesStore = order.map((id, index) => {
    const existing = current.find((stage) => stage.id === id);
    if (existing) {
      return {
        id: existing.id,
        nameEn: existing.name_en,
        nameAr: existing.name_ar,
        sortOrder: index,
        probability: existing.probability,
        color: existing.color,
        isActive: true,
        kind: existing.kind,
        isSystem: existing.is_system,
      };
    }
    return builtInRow(id, index);
  });
}
