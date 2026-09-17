import { describe, expect, it } from 'vitest';
import type { ClassInResolvedHomeworkQuestion, ClassInScene } from '../../contracts/classin-test';
import type { ImChatContext, ImChatReadResult } from '../../contracts/workbuddy/im-chat-context';
import { projectCatalog, projectContext } from './projections';

const homework = { id: 'h1', bizId: 'hb1', unitId: 'u1', categoryId: 'course', name: '第一讲作业', kind: 'homework' as const, startsAt: '2026-09-14T00:00:00.000Z', endsAt: '2026-09-16T00:00:00.000Z', published: true, process: 2, summary: {} };
const scene: ClassInScene = { environment: 'classin-test', teacher: { id: 'teacher', name: '老师' }, schoolRef: 'school', class: { id: 'class', name: '班级' }, course: { id: 'course', name: '课程' }, units: [{ id: 'u1', name: '【第1讲】有理数', count: 1 }], members: [{ id: 's1', name: '甲', identity: 1 }], activities: [homework], capturedAt: '2026-09-17T00:00:00.000Z', version: 'scene', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' } };
const read: ImChatReadResult = { threadRef: 'classin-test:class:class:course:course', capturedAt: scene.capturedAt, complete: false, messages: [
  { id: 'm1', sentAt: '2026-09-16T06:00:00.000Z', authorRole: 'student-family', authorName: '甲', body: '老师，昨天第一讲作业第二题怎么做？' },
  { id: 'm2', sentAt: '2026-09-16T06:10:00.000Z', authorRole: 'student-family', authorName: '甲', body: '圆周率是不是有理数？' },
  { id: 'm3', sentAt: '2026-09-16T06:12:00.000Z', authorRole: 'teacher', authorName: '老师', body: 'π 是无理数。', replyToId: 'm2' },
] };
const context: ImChatContext = { capturedAt: read.capturedAt, complete: false, omittedCount: 0, referenceId: 'm1', messages: read.messages };
const question: ClassInResolvedHomeworkQuestion = { activity: homework, position: 2, resourceId: 'r2', resourceName: 'q2.png', text: '早晨-5℃，中午升高8℃，夜间降低11℃。', textSource: 'apple-vision-ocr', capturedAt: scene.capturedAt, version: 'ocr-v1' };

describe('M5 ClassIn IM projections', () => {
  it('offers referenced F2 and F3 only when real messages match', () => {
    const questions = projectCatalog(scene, { im: true, chat: read }).questionGuidance!.questions;
    expect(questions.find(({ id }) => id === 'F2')).toMatchObject({ contextRefs: ['classin-test:message:m1'] });
    expect(questions.find(({ id }) => id === 'F3')).toMatchObject({ contextRefs: ['classin-test:message:m2'] });
    expect(questions.find(({ id }) => id === 'F2')?.text).toContain('甲');
    expect(questions.find(({ id }) => id === 'F3')?.text).toContain('只补充');
  });

  it('keeps OCR text and AI-solution boundary with the exact reference', () => {
    const snapshot = projectContext(scene, 'private-assistance', [], '讲解第一讲作业第二题', { chatContext: context, referencedQuestion: question, route: { questionId: 'F2', tools: ['read_im_history', 'resolve_referenced_question'] } });
    const text = snapshot.items.map(({ label, value }) => `${label}:${value}`).join('\n');
    expect(text).toContain('早晨-5℃');
    expect(text).toContain('模型新生成');
    expect(snapshot.toolRoute?.objectRefs).toEqual(expect.arrayContaining(['classin-test:message:m1', 'classin-test:activity:h1']));
    expect(snapshot.chatContext?.complete).toBe(false);
  });
});
