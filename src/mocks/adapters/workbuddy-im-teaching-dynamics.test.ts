import { describe, expect, it } from 'vitest';
import { FixedWorkBuddyImTeachingDynamicsAdapter } from './workbuddy-im-teaching-dynamics';

const request = {
  actorRef: 'teacher-001', tenantRef: 'school-1',
  target: { kind: 'class' as const, classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3' },
};

describe('FixedWorkBuddyImTeachingDynamicsAdapter', () => {
  it('expires the pre-class reminder when class begins and shows live attendance', async () => {
    const before = await new FixedWorkBuddyImTeachingDynamicsAdapter(() => new Date('2026-08-09T14:29:00+08:00')).list(request);
    expect(before.currentStage).toBe('before');
    expect(before.stages.find(({ id }) => id === 'before')?.items.some(({ id }) => id === 'physics-upcoming-momentum-class')).toBe(true);

    const during = await new FixedWorkBuddyImTeachingDynamicsAdapter(() => new Date('2026-08-09T14:40:00+08:00')).list(request);
    expect(during.currentStage).toBe('during');
    expect(during.stages.find(({ id }) => id === 'before')?.items.some(({ id }) => id === 'physics-upcoming-momentum-class')).toBe(false);
    expect(during.stages.find(({ id }) => id === 'before')?.items.some(({ id }) => id === 'physics-upcoming-induction-class')).toBe(true);
    expect(during.stages.find(({ id }) => id === 'during')?.items[0]?.title).toContain('3 人未进入');
  });

  it('shows the complete teaching prompt inventory at the fixed showcase time', async () => {
    const result = await new FixedWorkBuddyImTeachingDynamicsAdapter(() => new Date('2026-08-09T14:40:00+08:00')).list(request);
    const byStage = Object.fromEntries(result.stages.map(({ id, items }) => [id, items]));

    expect(byStage.before?.map(({ action }) => action?.label)).toEqual(['同步计划', '提醒上课']);
    expect(byStage.during?.map(({ action }) => action?.label)).toEqual(['提醒上课', undefined]);
    expect(byStage.after?.map(({ action }) => action?.label)).toEqual(['同步任务', '提醒交作业', '提醒交测验', '生成错题卡']);
    expect(byStage.summary?.map(({ action }) => action?.label)).toEqual(['生成回顾', '整班总结', '个人总结']);
    expect(byStage.during?.[1]).toMatchObject({ kind: 'confirmation', title: '已上课 15 分钟，全员到齐' });
    expect(result.stages.flatMap(({ items }) => items).filter(({ action }) => action)).toHaveLength(10);
    expect(result.stages.flatMap(({ items }) => items).every(({ action }) => !action || action.teacherRequest.startsWith('请'))).toBe(true);
  });

  it('expires reminders from business time instead of a UI completion state', async () => {
    const afterDeadline = await new FixedWorkBuddyImTeachingDynamicsAdapter(() => new Date('2026-08-13T09:00:00+08:00')).list(request);
    expect(afterDeadline.currentStage).toBe('summary');
    expect(afterDeadline.stages.flatMap(({ items }) => items).some(({ id }) => id === 'physics-new-homework')).toBe(false);
    expect(afterDeadline.stages.flatMap(({ items }) => items).some(({ id }) => id === 'physics-wrong-question-cards')).toBe(false);
  });

  it('labels the DW projection and keeps unknown facts cautious', async () => {
    const result = await new FixedWorkBuddyImTeachingDynamicsAdapter(() => new Date('2026-09-08T10:00:00+08:00')).list({
      ...request, target: { kind: 'class', classId: 'dw-expression-lab', classLabel: '表达与思辨体验班', threadId: 'class-dw-expression-lab' },
    });
    expect(result.truthLabel).toBe('read-only-business-data');
    expect(result.sourceRefs).toEqual(['dw-derived-im-2026-09-07-v1']);
    expect(result.stages.flatMap(({ items }) => items).find(({ id }) => id === 'dw-current-data-boundary')).toMatchObject({ kind: 'unknown' });
  });
});
