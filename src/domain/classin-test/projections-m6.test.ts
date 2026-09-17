import { describe, expect, it } from 'vitest';
import type { ClassInCourseProgress, ClassInScene } from '../../contracts/classin-test';
import { projectDynamics } from './projections';

const classroom = { id: 'lesson', bizId: 'lesson-biz', unitId: 'unit', categoryId: 'course', name: '第一讲课堂', kind: 'classroom' as const, startsAt: '2026-09-15T00:00:00.000Z', endsAt: '2026-09-15T01:00:00.000Z', published: true, process: 2, summary: {} };
const homework = { id: 'homework', bizId: 'homework-biz', unitId: 'unit', categoryId: 'course', name: '第一讲作业', kind: 'homework' as const, startsAt: '2026-09-15T01:00:00.000Z', endsAt: '2026-09-18T01:00:00.000Z', published: true, process: 1, summary: { submitTotal: 1 } };
const scene: ClassInScene = { environment: 'classin-test', teacher: { id: 'teacher', name: '老师' }, schoolRef: 'school', class: { id: 'class', name: '班级' }, course: { id: 'course', name: '课程' }, units: [{ id: 'unit', name: '第一讲', count: 2 }], members: [{ id: 'student', name: '学生', identity: 1 }], activities: [classroom, homework], capturedAt: '2026-09-17T00:00:00.000Z', version: 'scene-v1', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' } };
const progress: ClassInCourseProgress = { className: '班级', capturedAt: scene.capturedAt, version: 'progress-v1', courses: [{ id: 'course', name: '课程', unitCount: 1, activityCount: 2, classCount: 1, completedClassCount: 1, lastCompleted: classroom, nextClass: null }] };

describe('M6 recommendation coverage', () => {
  it('projects P01, P04 and P08 from their distinct verified triggers', () => {
    const items = projectDynamics(scene, { courseProgress: progress }).stages.flatMap(({ items }) => items);
    const keys = items.flatMap(({ recommendationKey }) => recommendationKey ? [recommendationKey] : []);
    expect(keys).toEqual(expect.arrayContaining(['P01', 'P04', 'P05', 'P08']));
    expect(items.find(({ recommendationKey }) => recommendationKey === 'P01')?.detail).toContain('不生成混合百分比');
    expect(items.find(({ recommendationKey }) => recommendationKey === 'P04')?.objectRef).toBe('classin-test:activity:lesson');
    expect(items.find(({ recommendationKey }) => recommendationKey === 'P04')?.action?.contextRefs).toEqual(['classin-test:activity:lesson', 'classin-test:activity:homework']);
    expect(items.find(({ recommendationKey }) => recommendationKey === 'P08')?.action?.contextRefs).toEqual(['classin-test:activity:lesson']);
  });

  it('never creates P03 while member-level realtime attendance is unavailable', () => {
    const activeScene = { ...scene, capturedAt: '2026-09-15T00:05:00.000Z', activities: [{ ...classroom, process: 1, summary: { studentTotal: 3, actualTotal: 3 } }] };
    const result = projectDynamics(activeScene, { courseProgress: progress });
    const items = result.stages.flatMap(({ items }) => items);
    expect(items.some(({ recommendationKey }) => recommendationKey === 'P03')).toBe(false);
    const unavailable = result.stages.find(({ id }) => id === 'during')?.items[0];
    expect(unavailable).toMatchObject({ kind: 'unknown', title: classroom.name, detail: '处于排定上课时间，实时到课情况暂未确认。' });
    expect(unavailable).not.toHaveProperty('action');
    expect(result.currentStage).toBe('during');
    expect(JSON.stringify(items)).not.toMatch(/满勤|全员到齐|缺勤3人/);
  });

  it.each([
    { name: 'future', capturedAt: '2026-09-14T23:59:59.000Z', activity: { ...classroom, process: 0 } },
    { name: 'ended by time', capturedAt: classroom.endsAt, activity: { ...classroom, process: 1 } },
    { name: 'ended by API', capturedAt: classroom.startsAt, activity: classroom },
    { name: 'cancelled', capturedAt: classroom.startsAt, activity: { ...classroom, process: 1, cancelled: true } },
    { name: 'unpublished', capturedAt: classroom.startsAt, activity: { ...classroom, process: 1, published: false } },
  ])('leaves during empty for $name without inserting an attendance blocker', ({ capturedAt, activity }) => {
    const result = projectDynamics({ ...scene, capturedAt, activities: [activity] });
    expect(result.stages.find(({ id }) => id === 'during')?.items).toEqual([]);
    expect(result.currentStage).not.toBe('during');
  });

  it('enters during at the exact scheduled start without also creating a pre-class reminder', () => {
    const result = projectDynamics({ ...scene, capturedAt: classroom.startsAt, activities: [{ ...classroom, process: 1 }] });
    expect(result.currentStage).toBe('during');
    expect(result.stages.find(({ id }) => id === 'during')?.items).toHaveLength(1);
    expect(result.stages.flatMap(({ items }) => items).some(({ recommendationKey }) => recommendationKey === 'P02')).toBe(false);
  });

  it.each([null, 'invalid-date'])('does not claim there is no class when an unfinished classroom time is %s', startsAt => {
    const result = projectDynamics({ ...scene, activities: [{ ...classroom, process: 1, startsAt }] });
    expect(result.stages.find(({ id }) => id === 'during')?.items).toEqual([expect.objectContaining({ kind: 'unknown', detail: '课堂时间信息不完整，暂时无法确认是否正在上课。' })]);
    expect(result.currentStage).not.toBe('during');
  });

  it('removes the course inventory row while keeping the actual lesson recap', () => {
    const summary = projectDynamics(scene).stages.find(({ id }) => id === 'summary')!;
    expect(summary.items.map(({ recommendationKey }) => recommendationKey)).toEqual(['P08']);
    expect(summary.items.some(({ id }) => id === 'course-inventory')).toBe(false);
    expect(projectDynamics({ ...scene, activities: [] }).stages.find(({ id }) => id === 'summary')?.items).toEqual([]);
  });
});
