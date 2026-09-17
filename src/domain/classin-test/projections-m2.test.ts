import { describe, expect, it } from 'vitest';
import type { ClassInHistoricalAttendance, ClassInScene } from '../../contracts/classin-test';
import { projectCatalog, projectContext } from './projections';

const classroom = { id: 'lesson-1', bizId: 'class-1', unitId: 'unit-1', categoryId: 'course-1', name: '第一课', kind: 'classroom' as const, startsAt: '2026-09-15T01:00:00Z', endsAt: '2026-09-15T02:00:00Z', published: true, process: 2, summary: { studentTotal: 1 } };
const recording = { id: 'recording-1', bizId: 'recording-biz-1', unitId: 'unit-1', categoryId: 'course-1', name: '第一课录播', kind: 'recording' as const, startsAt: '2026-09-15T03:00:00Z', endsAt: '2026-09-30T03:00:00Z', published: true, process: 1, summary: { studentTotal: 1 } };
const scene: ClassInScene = { environment: 'classin-test', teacher: { id: 'teacher', name: '老师' }, schoolRef: 'school', class: { id: 'class', name: '测试班' }, course: { id: 'course-1', name: '数学' }, units: [{ id: 'unit-1', name: '第一讲', count: 2 }], activities: [classroom, recording], members: [{ id: 'student-1', name: '学生甲', identity: 1 }], capturedAt: '2026-09-16T08:00:00Z', version: 'scene-v1', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' } };
const attendance: ClassInHistoricalAttendance = { status: 'available', capturedAt: scene.capturedAt, version: 'attendance-v1', limitation: '请假未知', lessons: [{ activity: classroom, expectedCount: 1, attendedCount: 0, lateCount: 0, earlyLeaveCount: 0, students: [{ id: 'student-1', name: '学生甲', attended: false, late: false, earlyLeave: false, durationSeconds: 0 }] }] };

describe('M2 ClassIn projections', () => {
  it('exposes B2 and B3 only when real lesson objects exist', () => {
    const questions = projectCatalog(scene).questionGuidance?.questions ?? [];
    expect(questions.find((question) => question.id === 'B2')?.contextRefs).toEqual([]);
    expect(questions.find((question) => question.id === 'B3')?.contextRefs).toEqual(['classin-test:activity:recording-1']);
  });

  it('keeps attendance names private and records every covered lesson in the route receipt', () => {
    const route = { questionId: 'B2' as const, tools: ['read_class_attendance' as const] };
    const privateSnapshot = projectContext(scene, 'private-assistance', [], '最近谁缺席', { historicalAttendance: attendance, route });
    expect(JSON.stringify(privateSnapshot)).toContain('学生甲');
    expect(privateSnapshot.toolRoute?.objectRefs).toEqual(['classin-test:activity:lesson-1']);
    const draft = projectContext(scene, 'message-draft', [], '整理班级出勤提醒', { historicalAttendance: attendance, route });
    expect(JSON.stringify(draft.items)).not.toContain('学生甲');
    expect(draft.excludedSensitiveCount).toBe(1);
  });
});
