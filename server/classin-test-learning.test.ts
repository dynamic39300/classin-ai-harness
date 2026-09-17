import { describe, expect, it } from 'vitest';
import type { ClassInActivityDetail, ClassInHistoricalAttendance, ClassInScene } from '../src/contracts/classin-test';
import { buildLearningSummary, shanghaiWeek } from './classin-test-learning';

const scene: ClassInScene = { environment: 'classin-test', teacher: { id: 't', name: '老师' }, schoolRef: 's', class: { id: 'c', name: '班' }, course: { id: 'co', name: '课' }, units: [],
  members: [{ id: 'u', name: '甲', identity: 1 }], capturedAt: '2026-09-17T00:00:00.000Z', version: 'v', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' }, activities: [] };
const task = { id: 'h', bizId: 'b', unitId: 'u', categoryId: 'co', name: '作业', kind: 'homework' as const, startsAt: '2026-09-14T00:00:00.000Z', endsAt: '2026-09-16T00:00:00.000Z', published: true, process: 2, summary: {} };
const detail: ClassInActivityDetail = { activity: task, capturedAt: scene.capturedAt, version: 'd', description: '', fields: [], resources: [], students: [{ id: 'u', name: '甲', status: '未提交', grade: null, progress: null, durationSeconds: null }] };
const attendance: ClassInHistoricalAttendance = { status: 'available', capturedAt: scene.capturedAt, version: 'a', limitation: '', lessons: [] };

describe('ClassIn weekly learning aggregation', () => {
  it('uses the Asia/Shanghai natural-week boundary', () => expect(shanghaiWeek(scene.capturedAt).from).toBe('2026-09-13T16:00:00.000Z'));
  it('separates overdue from future and reports missing material completion', () => {
    const result = buildLearningSummary(scene, [detail], attendance);
    expect(result.students[0]?.records[0]?.state).toBe('overdue');
    expect(result.limitations.join('')).toContain('PDF学习资料活动没有学生完成状态');
    expect(result.coverage.studentCount).toBe(1);
  });
  it('keeps the source version stable when the clock advances without changing a learning state', () => {
    const first = buildLearningSummary(scene, [detail], attendance);
    const second = buildLearningSummary({ ...scene, capturedAt: '2026-09-17T00:00:10.000Z' }, [detail], attendance);
    expect(second.capturedAt).not.toBe(first.capturedAt);
    expect(second.version).toBe(first.version);
  });
});
