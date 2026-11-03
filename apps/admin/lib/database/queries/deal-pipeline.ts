import { serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  DEAL_STAGE_DEFAULTS,
  DEAL_STAGE_ID,
  DEAL_STAGE_ORDER,
  SYSTEM_DEAL_STAGES,
  activityDealStages,
  isBuiltInDealStage,
  isSystemDealStage,
} from "../constants/crm";

/** One stage of the company's sales pipeline. */
export interface DealPipelineStage {
  id: string;
  /** Null: the built-in label for the company's activity. */
  name_en: string | null;
  name_ar: string | null;
  sort_order: number;
  probability: number;
  kind: "open" | "won" | "lost";
  color: string | null;
  is_system: boolean;
  is_active: boolean;
  /** Deals currently in this stage. */
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

const builtInRow = (id: string, sortOrder: number) => ({
  id,
  sortOrder,
  probability: isBuiltInDealStage(id)
    ? DEAL_STAGE_DEFAULTS[id].probability
    : 50,
  color: isBuiltInDealStage(id) ? DEAL_STAGE_DEFAULTS[id].color : null,
  kind: id === "closed_won" ? "won" : id === "closed_lost" ? "lost" : "open",
  isSystem: isSystemDealStage(id),
});

/** A fresh database (or one restored without the table's rows) gets the built-in pipeline. */
async function ensureDealPipeline() {
  if ((await db.dealPipelineStage.count()) > 0) return;
  await db.dealPipelineStage.createMany({
    data: DEAL_STAGE_ORDER.map((id, index) => builtInRow(id, index)),
    skipDuplicates: true,
  });
}

/** Every stage, active or not, in pipeline order, with how many deals each holds. */
export async function getDealPipeline(): Promise<DealPipelineStage[]> {
  await ensureDealPipeline();
  const [rows, counts] = await Promise.all([
    db.dealPipelineStage.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    db.crmDeal.groupBy({ by: ["dealStage"], _count: { _all: true } }),
  ]);
  const byStage = new Map(counts.map((c) => [c.dealStage, c._count._all]));
  return rows.map((row) => mapStage(row, byStage.get(row.id) ?? 0));
}

/** The stages deals can be in: active ones, plus any inactive stage that still holds deals. */
export async function getActiveDealStages(): Promise<DealPipelineStage[]> {
  return (await getDealPipeline()).filter(
    (stage) => stage.is_active || stage.deal_count > 0,
  );
}

export async function assertDealStage(stage: string) {
  await ensureDealPipeline();
  const found = await db.dealPipelineStage.findUnique({
    where: { id: stage },
    select: { isActive: true },
  });
  if (!found?.isActive) throw new Error(serverMessages.dealStageInvalid);
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

/**
 * Replaces the pipeline with `stages` (in order). System stages must all be present and active; a stage that
 * still holds deals cannot be removed or switched off. Closed stages always stay at the end.
 */
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
  await db.$transaction(async (tx) => {
    await tx.dealPipelineStage.deleteMany({ where: { id: { notIn: ids } } });
    for (let index = 0; index < ordered.length; index++) {
      const stage = ordered[index];
      const data = {
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
      };
      await tx.dealPipelineStage.upsert({
        where: { id: stage.id },
        create: { id: stage.id, ...data },
        update: data,
      });
    }
  });
  return getDealPipeline();
}

/**
 * Sets up the pipeline an activity recommends without losing anything: its stages are added and switched on,
 * other stages without deals are switched off, and stages that hold deals stay where they are.
 */
export async function applyActivityDealPipeline(
  activity: string | null | undefined,
) {
  const wanted: string[] = activityDealStages(activity);
  const current = await getDealPipeline();
  // Working stages that still hold deals stay, just before "invoiced".
  const inUse = current
    .filter((stage) => !wanted.includes(stage.id) && stage.deal_count > 0)
    .map((stage) => stage.id);
  const invoiced = wanted.indexOf("invoiced");
  const order = [
    ...wanted.slice(0, invoiced),
    ...inUse,
    ...wanted.slice(invoiced),
  ];
  await db.$transaction(async (tx) => {
    for (let index = 0; index < order.length; index++) {
      const id = order[index];
      const existing = current.find((stage) => stage.id === id);
      if (existing)
        await tx.dealPipelineStage.update({
          where: { id },
          data: { sortOrder: index, isActive: true },
        });
      else await tx.dealPipelineStage.create({ data: builtInRow(id, index) });
    }
    const switchedOff = current
      .filter((stage) => !order.includes(stage.id))
      .map((stage) => stage.id);
    if (switchedOff.length)
      await tx.dealPipelineStage.updateMany({
        where: { id: { in: switchedOff } },
        data: { isActive: false, sortOrder: order.length },
      });
  });
}
