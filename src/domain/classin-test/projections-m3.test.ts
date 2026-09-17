import { describe, expect, it } from 'vitest';
import type { ClassInQuestionAggregation, ClassInScene } from '../../contracts/classin-test';
import { projectCatalog, projectContext, projectDynamics } from './projections';

const scene: ClassInScene = {
  environment: 'classin-test', teacher: { id: 'teacher', name: '老师' }, schoolRef: 'school', class: { id: 'class', name: '班级' }, course: { id: 'course', name: '课程' },
  units: [{ id: 'unit', name: '单元', count: 3 }], members: [{ id: 'student', name: '学生甲', identity: 1 }], capturedAt: '2026-09-17T00:00:00.000Z', version: 'scene-v1', complete: true,
  capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' },
  activities: [
    { id: 'exam', bizId: 'exam-biz', unitId: 'unit', categoryId: 'course', name: '已完成测验', kind: 'exam', startsAt: '2026-09-15T00:00:00.000Z', endsAt: '2026-09-16T00:00:00.000Z', published: true, process: 2, summary: { studentTotal: 1, topicAmount: 1 } },
    { id: 'future-exam', bizId: 'future-biz', unitId: 'unit', categoryId: 'course', name: '进行中测验', kind: 'exam', startsAt: '2026-09-16T00:00:00.000Z', endsAt: '2026-09-18T00:00:00.000Z', published: true, process: 1, summary: { studentTotal: 1, submitTotal: 0, topicAmount: 1 } },
    { id: 'material', bizId: 'material-biz', unitId: 'unit', categoryId: 'course', name: '学习资料', kind: 'material', startsAt: '2026-09-15T00:00:00.000Z', endsAt: '2026-09-20T00:00:00.000Z', published: true, process: 1, summary: { studentTotal: 1 } },
  ],
};
const aggregate: ClassInQuestionAggregation = { status: 'available', capturedAt: scene.capturedAt, version: 'aggregate-v1', window: { from: '2026-09-16T00:00:00.000Z', to: scene.capturedAt },
  includedActivities: [{ id: 'exam', name: '已完成测验', endsAt: '2026-09-16T00:00:00.000Z', questionCount: 1, assignedCount: 3 }], excludedActivities: [], rule: '口径',
  questions: [{ activityId: 'exam', activityName: '已完成测验', activityEndsAt: '2026-09-16T00:00:00.000Z', topicId: 'q1', position: 1, content: '', hasImage: true, assignedCount: 3, validCount: 2, correctCount: 0, wrongCount: 1, partialCount: 1, pendingCount: 0, unansweredCount: 0, nonParticipantCount: 1 }],
};

describe('M3 ClassIn projections', () => {
  it('offers C5/E3 only when matching real objects exist and keeps E5 conversational', () => {
    const catalog = projectCatalog(scene);
    expect(catalog.questionGuidance?.questions.map(({ id }) => id)).toEqual(expect.arrayContaining(['C5', 'E3']));
    expect(catalog.questionGuidance?.questions.map(({ id }) => id)).not.toContain('E5');
  });
  it('projects a traceable C5 denominator and image limitation', () => {
    const snapshot = projectContext(scene, 'private-assistance', [], '哪些题错得多', { questionAggregation: aggregate, route: { questionId: 'C5', tools: ['aggregate_question_results'] } });
    const values = snapshot.items.map(({ value }) => value).join('');
    expect(values).toContain('有效判定2/3人');
    expect(values).toContain('题面含图片，未取得可读文字题干');
    expect(snapshot.toolRoute?.objectRefs).toEqual(['classin-test:activity:exam']);
  });
  it('adds P06 and P07 only from real active work and valid aggregation', () => {
    const snapshot = projectDynamics(scene, { questionAggregation: aggregate });
    const recommendations = snapshot.stages.flatMap(({ items }) => items.map(({ recommendationKey }) => recommendationKey));
    expect(recommendations).toEqual(expect.arrayContaining(['P06', 'P07']));
  });
});
