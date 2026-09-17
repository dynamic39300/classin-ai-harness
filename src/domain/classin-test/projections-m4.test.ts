import { describe, expect, it } from 'vitest';
import type { ClassInLearningSummary, ClassInScene } from '../../contracts/classin-test';
import { projectCatalog, projectContext, projectDynamics } from './projections';

const task = { id: 'homework', bizId: 'biz', unitId: 'unit', categoryId: 'course', name: '本周作业', kind: 'homework' as const, startsAt: '2026-09-14T00:00:00.000Z', endsAt: '2026-09-18T00:00:00.000Z', published: true, process: 1, summary: {} };
const scene: ClassInScene = { environment: 'classin-test', teacher: { id: 'teacher', name: '老师' }, schoolRef: 'school', class: { id: 'class', name: '班级' }, course: { id: 'course', name: '课程' }, units: [{ id: 'unit', name: '单元', count: 1 }],
  members: [{ id: 's1', name: '甲', identity: 1 }, { id: 's2', name: '乙', identity: 1 }], activities: [task], capturedAt: '2026-09-17T00:00:00.000Z', version: 'scene', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' } };
const learning: ClassInLearningSummary = { status: 'available', capturedAt: scene.capturedAt, version: 'learning', period: { from: '2026-09-13T16:00:00.000Z', to: scene.capturedAt, timeZone: 'Asia/Shanghai', label: '当前自然周截至读取时刻' },
  students: [
    { id: 's1', name: '甲', records: [{ activity: task, state: 'incomplete', status: '未提交', grade: null, progress: null, durationSeconds: null }] },
    { id: 's2', name: '乙', records: [{ activity: task, state: 'complete', status: '已批阅', grade: null, progress: null, durationSeconds: null }] },
  ], futureSchedule: [], coverage: { studentCount: 2, activityCount: 1, byKind: { classroom: 0, homework: 1, exam: 0, recording: 0, material: 0 } }, limitations: ['受限聚合，不是正式学情报告。'] };

describe('M4 ClassIn projections', () => {
  it('offers explicit-student D questions and an E4 class question', () => {
    const catalog = projectCatalog(scene); const questions = catalog.questionGuidance!.questions;
    expect(questions.map(({ id }) => id)).toEqual(expect.arrayContaining(['D1', 'D2', 'D5', 'E4']));
    expect(questions.find(({ id }) => id === 'D1')?.contextRefs).toEqual(['classin-test:student:s1']);
  });
  it('keeps personal context scoped to the explicitly selected student', () => {
    const snapshot = projectContext(scene, 'private-assistance', [], '了解甲本周的学习情况', { learningSummary: learning, targetStudentId: 's1', route: { questionId: 'D1', tools: ['read_student_learning'] } });
    const text = snapshot.items.map(({ value }) => value).join('');
    expect(text).toContain('接口状态未提交'); expect(text).not.toContain('乙');
    expect(snapshot.toolRoute?.objectRefs).toEqual(['classin-test:student:s1']);
  });
  it('projects P09 and P10 from verified coverage', () => {
    const recommendations = projectDynamics(scene, { learningSummary: learning }).stages.flatMap(({ items }) => items.map(({ recommendationKey }) => recommendationKey));
    expect(recommendations).toEqual(expect.arrayContaining(['P09', 'P10']));
  });
});
