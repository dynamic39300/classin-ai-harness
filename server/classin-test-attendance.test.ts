// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { ClassInScene } from '../src/contracts/classin-test';
import { readHistoricalAttendance } from './classin-test-attendance';
import { ClassInError, TEST_SCOPE, type ClassInTransport } from './classin-test-transport';

const scene: ClassInScene = {
  environment: 'classin-test', teacher: { id: 'teacher', name: '老师' }, schoolRef: 'school',
  class: { id: TEST_SCOPE.classId, name: '测试班' }, course: { id: TEST_SCOPE.categoryId, name: '数学' },
  units: [{ id: '30', name: '第一讲', count: 2 }],
  activities: [
    { id: '11', bizId: '21', unitId: '30', categoryId: TEST_SCOPE.categoryId, name: '第二课', kind: 'classroom', startsAt: '2026-09-16T01:00:00Z', endsAt: '2026-09-16T02:00:00Z', published: true, process: 2, summary: { studentTotal: 2 } },
    { id: '10', bizId: '20', unitId: '30', categoryId: TEST_SCOPE.categoryId, name: '第一课', kind: 'classroom', startsAt: '2026-09-15T01:00:00Z', endsAt: '2026-09-15T02:00:00Z', published: true, process: 2, summary: { studentTotal: 2 } },
  ],
  members: [{ id: '7', name: '学生甲', identity: 1 }, { id: '8', name: '学生乙', identity: 1 }],
  capturedAt: '2026-09-16T08:00:00Z', version: 'scene-v1', complete: true,
  capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' },
};

describe('historical attendance reader', () => {
  it('sorts recent ended lessons and keeps member facts directly reproducible', async () => {
    const transport = vi.fn<ClassInTransport>(async (_path, fields) => fields.activityId === '11' ? [
      { studentUid: 7, onClass: 0, isLate: 0, isEarly: 0, classLength: 0 },
      { studentUid: 8, onClass: 1, isLate: 1, isEarly: 0, classLength: 2400 },
    ] : [
      { studentUid: 7, onClass: 1, isLate: 0, isEarly: 1, classLength: 1800 },
      { studentUid: 8, onClass: 1, isLate: 0, isEarly: 0, classLength: 2700 },
    ]);
    const result = await readHistoricalAttendance(transport, scene, 2);
    expect(result.lessons.map((lesson) => lesson.activity.id)).toEqual(['11', '10']);
    expect(result.lessons[0]).toMatchObject({ expectedCount: 2, attendedCount: 1, lateCount: 1, earlyLeaveCount: 0 });
    expect(result.lessons[0]?.students[0]).toMatchObject({ name: '学生甲', attended: false, durationSeconds: 0 });
    expect(result.limitation).toContain('请假状态当前接口未提供');
  });

  it('fails closed for incomplete rosters, foreign students and unknown enums', async () => {
    await expect(readHistoricalAttendance(async () => [{ studentUid: 7, onClass: 1, isLate: 0, isEarly: 0, classLength: 10 }], scene)).rejects.toMatchObject({ code: 'incomplete' });
    await expect(readHistoricalAttendance(async () => [{ studentUid: 7, onClass: 1, isLate: 0, isEarly: 0, classLength: 10 }, { studentUid: 99, onClass: 1, isLate: 0, isEarly: 0, classLength: 10 }], scene)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(readHistoricalAttendance(async () => [{ studentUid: 7, onClass: 2, isLate: 0, isEarly: 0, classLength: 10 }, { studentUid: 8, onClass: 1, isLate: 0, isEarly: 0, classLength: 10 }], scene)).rejects.toBeInstanceOf(ClassInError);
  });
});
