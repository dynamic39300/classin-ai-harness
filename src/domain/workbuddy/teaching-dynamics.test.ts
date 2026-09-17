import { describe, expect, it } from 'vitest';
import type { TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';
import { normalizeTeachingDynamics, projectTeachingPrompts, projectTeachingStage, teachingDynamicsCompactLabel } from './teaching-dynamics';

const snapshot: TeachingDynamicsSnapshot = {
  threadRef: 'class-1', currentStage: 'after', capturedAt: '2026-09-09T10:00:00.000Z', version: 'v1', sourceRefs: ['fixture'], truthLabel: 'fixed-demo',
  stages: [
    { id: 'after', items: [
      { id: 'late', stage: 'after', kind: 'attention', title: '作业待交', detail: '5 人', priority: 80, action: { label: '提醒', teacherRequest: '提醒未交作业的学生。' } },
      { id: 'review', stage: 'after', kind: 'teacher-task', title: '待批改', detail: '1 份', priority: 40 },
    ] },
    { id: 'before', items: [{ id: 'done', stage: 'before', kind: 'confirmation', title: '全勤', detail: '无需处理', priority: 10 }] },
    { id: 'summary', items: [{ id: 'late', stage: 'summary', kind: 'attention', title: '重复项', detail: '不应保留', priority: 99 }] },
  ],
};

describe('teaching dynamics projection', () => {
  it('normalizes stages, sorts items and removes cross-stage duplicates', () => {
    const result = normalizeTeachingDynamics(snapshot);
    expect(result.stages.map(({ id }) => id)).toEqual(['before', 'during', 'after', 'summary']);
    expect(result.stages.find(({ id }) => id === 'summary')?.items).toHaveLength(0);
    expect(result.currentStage).toBe('after');
  });

  it('keeps the lead row and exposes the remaining count for a summarized stage', () => {
    const result = projectTeachingStage(normalizeTeachingDynamics(snapshot), 'after', false);
    expect(result.lead?.id).toBe('late');
    expect(result.hiddenCount).toBe(1);
    expect(result.actionableCount).toBe(2);
  });

  it('projects a compact prompt entry and counts only actionable work', () => {
    const normalized = normalizeTeachingDynamics(snapshot);
    expect(projectTeachingPrompts(normalized).map(({ id }) => id)).toEqual(['late', 'review']);
    expect(teachingDynamicsCompactLabel(normalized)).toBe('教学动态｜2 项建议');
  });

  it('keeps the compact total accurate when more than four suggestions exist', () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      id: `suggestion-${index}`,
      stage: 'after' as const,
      kind: 'attention' as const,
      title: `建议 ${index + 1}`,
      detail: '可发起沟通',
      priority: index,
      action: { label: '生成消息', teacherRequest: `生成消息 ${index + 1}` },
    }));
    const crowded = normalizeTeachingDynamics({ ...snapshot, stages: [{ id: 'after', items }] });

    expect(projectTeachingPrompts(crowded)).toHaveLength(4);
    expect(teachingDynamicsCompactLabel(crowded)).toBe('教学动态｜6 项建议');
  });

  it('deduplicates a stable recommendation for the same object and context version', () => {
    const duplicated = normalizeTeachingDynamics({
      ...snapshot,
      stages: [{ id: 'after', items: [
        { id: 'first', recommendationKey: 'P05', objectRef: 'homework-1', stage: 'after', kind: 'attention', title: '第一次', detail: '同一建议', priority: 20, action: { label: '提醒', teacherRequest: '提醒' } },
        { id: 'second', recommendationKey: 'P05', objectRef: 'homework-1', stage: 'after', kind: 'attention', title: '第二次', detail: '应去重', priority: 10, action: { label: '提醒', teacherRequest: '提醒' } },
      ] }],
    });

    expect(duplicated.stages.find(({ id }) => id === 'after')?.items.map(({ id }) => id)).toEqual(['first']);
  });
});
