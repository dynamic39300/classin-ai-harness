// @vitest-environment node
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ClassInActivity, ClassInScene } from '../src/contracts/classin-test';
import { readCapturedIm, readCourseProgress, readLessonReview } from './classin-test-copilot';
import { TEST_SCOPE, type ClassInTransport } from './classin-test-transport';

const lesson: ClassInActivity = { id: '10', bizId: '20', unitId: '30', categoryId: TEST_SCOPE.categoryId, name: '第2讲 有理数', kind: 'classroom', startsAt: '2026-09-16T06:00:00Z', endsAt: '2026-09-16T07:00:00Z', published: true, cancelled: false, process: 2, summary: {} };
const scene: ClassInScene = { environment: 'classin-test', teacher: { id: `classin-test:teacher:${TEST_SCOPE.uid}`, name: '测试老师' }, schoolRef: `classin-test:school:${TEST_SCOPE.schoolId}`,
  class: { id: TEST_SCOPE.classId, name: '测试班' }, course: { id: TEST_SCOPE.categoryId, name: '数学' }, units: [{ id: '30', name: '第2讲', count: 1 }], activities: [lesson],
  members: [{ id: '7', name: '学生甲', identity: 1 }], capturedAt: '2026-09-16T08:00:00Z', version: 'scene-v1', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' } };

describe('ClassIn Copilot M1 readers', () => {
  it('computes every real course separately without a mixed percentage', async () => {
    const transport = vi.fn<ClassInTransport>(async (path, fields) => {
      if (path.endsWith('/category/list')) return { list: [{ categoryId: 1, name: '课程一' }, { categoryId: 2, name: '课程二' }] };
      if (path.endsWith('/unitList')) return { list: [{ unitId: Number(fields.categoryId) * 10, categoryId: String(fields.categoryId), name: '单元', activityCount: 1 }] };
      if (path.endsWith('/unitActivityList')) return { list: [{ unitId: Number(fields.categoryId) * 10, pageTotal: 1, activities: [{ activityId: Number(fields.categoryId) * 100, bizId: 20, unitId: Number(fields.categoryId) * 10, categoryId: String(fields.categoryId), name: `课堂${fields.categoryId}`, type: 1, startTime: 1789540000, endTime: 1789543600, publishFlag: 2, processFlag: 2, status: {} }] }] };
      throw new Error(path);
    });
    const result = await readCourseProgress(transport, scene, new Date('2026-09-16T08:00:00Z'));
    expect(result.courses.map((course) => course.name)).toEqual(['课程一', '课程二']);
    expect(result.courses.every((course) => course.completedClassCount === 1)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('percentage');
  });

  it('keeps original transcript text and labels AI analysis as a separate source', async () => {
    const transport = vi.fn<ClassInTransport>(async (path) => {
      if (path.includes('getLessonRecordInfo')) return { lessonId: '20', lessonData: { fileList: [{ FileId: '99' }] } };
      if (path.includes('richVideoSummary')) return { content: { children: [{ desc: '原始转写：负三的平方', metadata: { times: ['00:00:01', '00:00:05'] } }] } };
      if (path.includes('checkAiTeachingAnalysisRecord')) return { hasRecord: true };
      if (path.includes('/file/aiTeachingAnalysis')) return { list: [{ reportUrl: 'https://example.test/report?report=token', requestFileId: '88' }] };
      if (path.includes('/admin/ai-teaching-analysis/report')) return { reportContent: JSON.stringify({ rawMarkdown: '```json\n{"summary":"AI整理的课堂重点"}\n```' }) };
      throw new Error(path);
    });
    const result = await readLessonReview(transport, scene, lesson);
    expect(result.transcript).toMatchObject({ status: 'available', usableFileCount: 1, segmentCount: 1 });
    expect(result.transcript.text).toContain('原始转写：负三的平方');
    expect(result.aiAnalysis).toMatchObject({ status: 'available' });
    expect(result.aiAnalysis.text).toContain('AI整理的课堂重点');
    expect(result.aiAnalysis.limitation).toContain('AI授课分析是生成内容');
  });

  it('reads unmasked authorized IM bodies and records incomplete capture coverage', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'classin-im-')); const file = join(dir, 'latest.json');
    await writeFile(file, JSON.stringify({ version: 'private-im-original-v1', capturedAt: '2026-09-16T08:00:00Z', scope: { uid: TEST_SCOPE.uid, courseId: TEST_SCOPE.classId }, coverage: { complete: false }, frames: [{ type: 'requestChatMsg', messages: [
      { clusterId: { id: Number(TEST_SCOPE.classId) }, msgId: 1, talkerUid: 7, time: 1789540000, content: '老师，第二题怎么做？', type: 0, isDeleted: false, isUndone: false },
      { clusterId: { id: Number(TEST_SCOPE.classId) }, msgId: 2, talkerUid: Number(TEST_SCOPE.uid), time: 1789540010, content: '我来讲一下。', type: 0, isDeleted: false, isUndone: false },
    ] }] }), { mode: 0o600 });
    const result = await readCapturedIm(scene, file);
    expect(result.complete).toBe(false);
    expect(result.messages.map((message) => message.body)).toEqual(['老师，第二题怎么做？', '我来讲一下。']);
    expect(result.messages.map((message) => message.authorName)).toEqual(['学生甲', '测试老师']);
    expect(JSON.stringify(result)).not.toContain('REDACTED');
  });

  it('keeps agent and retracted messages distinguishable from student text', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'classin-im-state-')); const file = join(dir, 'latest.json');
    await writeFile(file, JSON.stringify({ version: 'private-im-original-v1', capturedAt: '2026-09-16T08:00:00Z', scope: { uid: TEST_SCOPE.uid, courseId: TEST_SCOPE.classId }, coverage: { complete: false }, frames: [{ type: 'receiveChatMsg', messages: [
      { clusterId: { id: Number(TEST_SCOPE.classId) }, msgId: 3, talkerUid: 0, agentId: 'assistant', agentName: 'AI学情', time: 1789540000, content: '系统生成的分析', type: 0, isDeleted: false, isUndone: false },
      { clusterId: { id: Number(TEST_SCOPE.classId) }, msgId: 4, talkerUid: 7, time: 1789540010, content: '撤回前正文', type: 0, isDeleted: false, isUndone: true },
    ] }] }), { mode: 0o600 });
    const result = await readCapturedIm(scene, file);
    expect(result.messages[0]).toMatchObject({ authorRole: 'class-agent', authorName: 'AI学情' });
    expect(result.messages[1]).toMatchObject({ authorRole: 'student-family', retracted: true });
  });

  it('rejects a same-id pagination conflict instead of selecting one body', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'classin-im-conflict-')); const file = join(dir, 'latest.json');
    const message = { clusterId: { id: Number(TEST_SCOPE.classId) }, msgId: 5, talkerUid: 7, time: 1789540000, content: '版本一', type: 0, isDeleted: false, isUndone: false };
    await writeFile(file, JSON.stringify({ version: 'private-im-original-v1', capturedAt: '2026-09-16T08:00:00Z', scope: { uid: TEST_SCOPE.uid, courseId: TEST_SCOPE.classId }, coverage: { complete: false }, frames: [{ type: 'requestChatMsg', messages: [message] }, { type: 'receiveChatMsg', messages: [{ ...message, content: '版本二' }] }] }), { mode: 0o600 });
    await expect(readCapturedIm(scene, file)).rejects.toMatchObject({ code: 'incomplete' });
  });
});
