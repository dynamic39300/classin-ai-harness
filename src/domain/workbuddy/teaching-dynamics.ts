import type {
  TeachingDynamicItem,
  TeachingDynamicStage,
  TeachingDynamicsSnapshot,
  TeachingStageId,
} from '@contracts/workbuddy/teaching-dynamics';

export const TEACHING_STAGE_ORDER: readonly TeachingStageId[] = Object.freeze(['before', 'during', 'after', 'summary']);

export const TEACHING_STAGE_LABELS: Readonly<Record<TeachingStageId, string>> = Object.freeze({
  before: '课前',
  during: '课中',
  after: '课后',
  summary: '总结',
});

export type TeachingStageProjection = Readonly<{
  id: TeachingStageId;
  label: string;
  items: readonly TeachingDynamicItem[];
  lead: TeachingDynamicItem | null;
  hiddenCount: number;
  actionableCount: number;
}>;

function sortItems(items: readonly TeachingDynamicItem[]) {
  return [...items].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
}

export function isTeachingDynamicActionable(item: TeachingDynamicItem) {
  return Boolean(item.action) || item.kind === 'teacher-task';
}

export function normalizeTeachingDynamics(snapshot: TeachingDynamicsSnapshot): TeachingDynamicsSnapshot {
  const seen = new Set<string>();
  const stages: TeachingDynamicStage[] = TEACHING_STAGE_ORDER.map((stageId) => {
    const source = snapshot.stages.find(({ id }) => id === stageId);
    const items = sortItems((source?.items ?? []).filter((item) => {
      if (item.stage !== stageId || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }));
    return Object.freeze({ id: stageId, items: Object.freeze(items) });
  });
  const currentStage = stages.some(({ id, items }) => id === snapshot.currentStage && items.length > 0)
    ? snapshot.currentStage
    : stages.find(({ items }) => items.length > 0)?.id ?? snapshot.currentStage;
  return Object.freeze({ ...snapshot, currentStage, stages: Object.freeze(stages) });
}

export function projectTeachingStage(snapshot: TeachingDynamicsSnapshot, stageId: TeachingStageId, fullyExpanded: boolean): TeachingStageProjection {
  const stage = snapshot.stages.find(({ id }) => id === stageId);
  const allItems = stage?.items ?? [];
  const items = fullyExpanded ? allItems : allItems.slice(0, 1);
  return Object.freeze({
    id: stageId,
    label: TEACHING_STAGE_LABELS[stageId],
    items,
    lead: allItems[0] ?? null,
    hiddenCount: Math.max(0, allItems.length - items.length),
    actionableCount: allItems.filter(isTeachingDynamicActionable).length,
  });
}

export function projectTeachingPrompts(snapshot: TeachingDynamicsSnapshot, limit = 4): readonly TeachingDynamicItem[] {
  const current = snapshot.stages.find(({ id }) => id === snapshot.currentStage)?.items ?? [];
  const remaining = TEACHING_STAGE_ORDER
    .filter((stageId) => stageId !== snapshot.currentStage)
    .flatMap((stageId) => snapshot.stages.find(({ id }) => id === stageId)?.items ?? []);
  return Object.freeze([...current, ...remaining].filter(isTeachingDynamicActionable).slice(0, limit));
}

export function teachingDynamicsCompactLabel(snapshot: TeachingDynamicsSnapshot) {
  const count = snapshot.stages.flatMap(({ items }) => items).filter(isTeachingDynamicActionable).length;
  if (count) return `教学动态｜${count} 项建议`;
  const containsUnknown = snapshot.stages.some(({ items }) => items.some(({ kind }) => kind === 'unknown'));
  return containsUnknown ? '教学动态｜待核对' : '教学动态｜当前已核对';
}
