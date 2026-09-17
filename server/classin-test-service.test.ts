// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createClassInTestService, fromSeconds } from './classin-test-service';
import { signedRequest, TEST_SCOPE, unwrap, type ClassInTransport } from './classin-test-transport';
import { projectContext, projectDynamics } from '../src/domain/classin-test/projections';
import { allowsClassInRequest } from './classin-test-middleware';
import type { IncomingMessage } from 'node:http';
const now = () => new Date('2026-09-15T10:00:00Z');
const start = now().valueOf() / 1000 + 3600;
function fixture(options: { total?: number; category?: string; pages?: number; empty?: boolean; studentCount?: number; stStatus?: number; draft?: number; download?: number; exam?: boolean; foreignExam?: boolean } = {}) {
  const rawActivity = { activityId: 1001, unitId: 901, categoryId: TEST_SCOPE.categoryId, bizId: 1002, name: '有理数练习', type: options.exam ? 3 : 2, startTime: start, endTime: start + 172800, publishFlag: 2, processFlag: 0, status: { studentTotal: 1, submitTotal: 0 } };
  const transport = vi.fn<ClassInTransport>(async (path) => {
    if (path.endsWith('/member/course_list')) return { total: options.total ?? 1, list: [{ courseId: TEST_SCOPE.classId, schoolUid: TEST_SCOPE.schoolId, identity: 192, courseName: '契约测试班' }] };
    if (path.endsWith('/category/list')) return { list: [{ categoryId: TEST_SCOPE.categoryId, name: '有理数课程' }] };
    if (path.endsWith('/getCourseMember')) return [{ memberUid: 8001, userName: '学生甲', courseNickname: '', identity: 1, mobile: 'PRIVATE-PHONE', email: 'PRIVATE-EMAIL' }];
    if (path.endsWith('/unitList')) return { list: [{ unitId: 901, categoryId: TEST_SCOPE.categoryId, name: '第1讲 有理数', activityCount: options.empty ? 0 : 1 }] };
    if (path.endsWith('/unitActivityList')) return { list: options.empty ? [] : [{ unitId: 901, pageTotal: options.pages ?? 1, activities: [{ ...rawActivity, categoryId: options.category ?? TEST_SCOPE.categoryId }] }] };
    if (path.endsWith('/exam/get')) return { id: 1001, bizId: options.foreignExam ? 999 : 1002, courseId: TEST_SCOPE.classId, categoryId: TEST_SCOPE.categoryId, unitId: 901, studentTotal: 1, isScore: 1, maxScore: 100, paperInfo: { paper: [{ topicInfos: [{ topicId: 9001, topicSource: 0 }] }] } };
    if (path.endsWith('/exam/students')) return [{ studentUid: 8001, stStatus: 0, isScore: 1, showGrade: '0' }];
    if (path.includes('/topic/batchGet')) return { list: [{ topicId: 9001, topicType: 1, content: '计算-2+3', options: ['1', '2'], answer: ['1'] }] };
    if (path.includes('getAnswerMarkResult')) return { examId: 1002, students: [{ studentId: 8001, markingInfo: [{ topicId: 9001, topicType: 1, topicSource: 0, isAnswer: 2, answer: '', score: 0, judgeResult: 0 }] }] };
    if (path.endsWith('/homework/get')) return { id: 1001, courseId: TEST_SCOPE.classId, categoryId: TEST_SCOPE.categoryId, unitId: 901, studentTotal: options.studentCount ?? 1, isScore: 0, isDownload: options.download ?? 0, homeworkDesc: '<p>计算 -2+3</p>', image: '[]', docs: '[]', shareKey: 'PRIVATE-SHARE-KEY' };
    if (path.endsWith('/homework/students')) return [{ studentUid: 8001, stStatus: options.stStatus ?? 0, isDraft: options.draft ?? 0, isScore: 0, showGrade: '', rate: '0.0000' }];
    if (path.endsWith('/homework/student/detail')) return { stu_homework_detail: { student_uid: 8001, homework_id: 1002, course_id: TEST_SCOPE.classId, school_uid: TEST_SCOPE.schoolId, is_del: 0, is_draft: 0, status: 1, content: '学生提交正文', th_content: '教师私有评语', image: '[]' } };
    throw new Error(`Unexpected route ${path}`);
  });
  return { service: createClassInTestService(transport, now), transport };
}
describe('ClassIn test read boundary', () => {
  it('rejects question images outside a published exam or after source ownership changes', async () => {
    const base = fixture({ exam: true });
    await expect(base.service.questionResource('999', '9001', 'a'.repeat(64))).rejects.toMatchObject({ code: 'forbidden' });
    await expect(fixture().service.questionResource('1001', '9001', 'a'.repeat(64))).rejects.toMatchObject({ code: 'forbidden' });
    for (const change of [{ courseId: '999' }, { categoryId: '999' }, { unitId: 999 }, { bizId: 999 }, { publishFlag: 0 }, { isDeleted: 1 }]) {
      const read = vi.fn<ClassInTransport>(async (path, args, form) => {
        const value = await base.transport(path, args, form);
        return path.endsWith('/exam/get') ? { ...value as object, publishFlag: 2, isDeleted: 0, ...change } : value;
      });
      await expect(createClassInTestService(read, now).questionResource('1001', '9001', 'a'.repeat(64))).rejects.toMatchObject({ code: 'forbidden' });
      expect(read.mock.calls.some(([p]) => p.includes('/topic/batchGet'))).toBe(false);
    }
  });
  it('keeps question media references out of both context uses while preserving incomplete-text evidence', async () => {
    const { service } = fixture({ exam: true }); const scene = await service.scene(); const detail = await service.detail('1001');
    const item = { ...detail, questions: detail.questions!.map((q) => ({ ...q, hasImage: true, images: [{ ref: 'PRIVATE-IMAGE-REF', name: 'PRIVATE-FILENAME' }] })) };
    for (const use of ['private-assistance', 'message-draft'] as const) expect(JSON.stringify(projectContext(scene, use, [item], '第1题'))).not.toMatch(/PRIVATE/);
    expect(JSON.stringify(projectContext(scene, 'private-assistance', [item], '第1题'))).toContain('文字题干不完整');
  });
  it('provides authoritative Shanghai weekdays across UTC midnight for reminder dates', async () => {
    const scene = await fixture().service.scene();
    const activity = { ...scene.activities[0], startsAt: '2026-09-14T16:30:00Z', endsAt: '2026-09-15T16:30:00Z' };
    const context = projectContext({ ...scene, capturedAt: '2026-09-14T16:00:00Z', activities: [activity] }, 'message-draft', [{ activity, capturedAt: scene.capturedAt, version: 'calendar', description: '', fields: [], resources: [], students: [] }]);
    const text = context.items.map((item) => item.value).join('');
    expect(text).toContain('2026/09/15 00:30（星期二）');
    expect(text).toContain('2026/09/16 00:30（星期三）');
    expect(text).toContain('2026/09/15 00:00（星期二）');
  });
  it('keeps replay files distinct from scheduled duration and empty or failed reads in context', async () => {
    const { service } = fixture(); const scene = await service.scene(); const detail = await service.detail('1001');
    const replay = { state: 'files_returned' as const, message: '已返回1个录制文件，播放未验证', files: [{ statusCode: '2', durationSeconds: 1707, startsAt: '2026-09-14T11:46:49Z', endsAt: '2026-09-14T12:15:14Z', createdAt: null }] };
    const text = projectContext(scene, 'private-assistance', [{ ...detail, replay }]).items.map((i) => i.value).join('');
    expect(text).toContain('文件时长1707秒'); expect(text).toContain('录制开始2026/09/14 19:46:49');
    expect(text).toContain('不能声称全部课堂内容均已录入');
    expect(text).toContain('不能从教师笔记推断未录时段讲了哪些具体内容');
    expect(projectContext(scene, 'message-draft', [{ ...detail, replay: { state: 'unavailable', files: [], message: '本次回放结果无法核实' } }]).items.map((i) => i.value).join('')).toContain('本次回放结果无法核实');
  });
  it('does not give unrelated notes to a replay duration query as a teaching timeline', async () => {
    const { service } = fixture(); const scene = await service.scene(); const detail = await service.detail('1001');
    const classroomResult = { status: 'available' as const, message: '课后报告', durationSeconds: 2700, attendance: null, highlights: 0, blackboards: 0, notes: [{ id: '1', text: 'PRIVATE-TEACHING-NOTE', createdAt: null }], notesMessage: '本人笔记', aiAnalysis: 'not_generated' as const };
    expect(JSON.stringify(projectContext(scene, 'private-assistance', [{ ...detail, classroomResult }], '课堂回放录制多久'))).not.toContain('PRIVATE-TEACHING-NOTE');
    expect(JSON.stringify(projectContext(scene, 'private-assistance', [{ ...detail, classroomResult }], '教师笔记有哪些知识点'))).toContain('PRIVATE-TEACHING-NOTE');
    expect(JSON.stringify(projectContext(scene, 'message-draft', [{ ...detail, classroomResult }], '教师笔记有哪些知识点'))).not.toContain('PRIVATE-TEACHING-NOTE');
  });
  it('normalizes verified scene and removes contacts/secrets', async () => {
    const { service } = fixture(); const s = await service.scene();
    expect(s.activities).toHaveLength(1); expect(s.members).toEqual([{ id: '8001', name: '学生甲', identity: 1 }]);
    expect(JSON.stringify(s)).not.toMatch(/PRIVATE|secret|mobile|email/);
    expect((await service.scene()).version).toBe(s.version);
  });
  it('coalesces concurrent scene reads without using a stale cache', async () => {
    const { service, transport } = fixture(); await Promise.all([service.scene(), service.scene()]);
    expect(transport.mock.calls.filter(([p]) => p.endsWith('course_list'))).toHaveLength(1);
    await service.scene(); expect(transport.mock.calls.filter(([p]) => p.endsWith('course_list'))).toHaveLength(2);
  });
  it('fails closed for cross-course response and unknown activity', async () => {
    await expect(fixture({ category: '999' }).service.scene()).rejects.toMatchObject({ code: 'forbidden' });
    const { service, transport } = fixture(); await expect(service.detail('999')).rejects.toMatchObject({ code: 'forbidden' });
    expect(transport.mock.calls.some(([p]) => p.endsWith('/homework/get'))).toBe(false);
  });
  it('rejects replay access outside a published classroom and changed source ownership before requesting media', async () => {
    const base = fixture();
    for (const activityId of ['999', '1001']) await expect(base.service.replayStream(activityId, 'a'.repeat(64), undefined, new AbortController().signal)).rejects.toMatchObject({ code: 'forbidden' });
    expect(base.transport.mock.calls.some(([path]) => path.includes('getLessonRecordInfo'))).toBe(false);
    for (const change of [{ courseId: '999' }, { categoryId: '999' }, { unitId: 999 }, { bizId: 999 }]) {
      const source = { id: 1001, courseId: TEST_SCOPE.classId, categoryId: TEST_SCOPE.categoryId, unitId: 901, bizId: 1002, ...change };
      const read = vi.fn<ClassInTransport>(async (path, params, json) => {
        if (path.endsWith('/class/get')) return source;
        const value = await base.transport(path, params, json);
        if (path.endsWith('/unitActivityList')) return { list: [{ unitId: 901, pageTotal: 1, activities: [{ activityId: 1001, unitId: 901, categoryId: TEST_SCOPE.categoryId, bizId: 1002, name: '在线课堂', type: 1, startTime: start, endTime: start + 2700, publishFlag: 2, processFlag: 0, status: {} }] }] };
        return value;
      });
      await expect(createClassInTestService(read, now).replayStream('1001', 'a'.repeat(64), undefined, new AbortController().signal)).rejects.toMatchObject({ code: 'forbidden' });
      expect(read.mock.calls.some(([path]) => path.includes('getLessonRecordInfo'))).toBe(false);
    }
  });
  it('requires current membership, assignment, submission and download permission before reading an answer image', async () => {
    for (const options of [{ download: 0, stStatus: 1 }, { download: 1, stStatus: 0 }, { download: 1, stStatus: 1, draft: 1 }]) {
      const base = fixture(options);
      const read = vi.fn<ClassInTransport>(async (path, args, form) => {
        const value = await base.transport(path, args, form);
        return path.endsWith('/homework/get') ? { ...value as object, bizId: 1002 } : value;
      });
      await expect(createClassInTestService(read, now).submissionResource('1001', '8001', 'a'.repeat(64))).rejects.toMatchObject({ code: 'forbidden' });
      expect(read.mock.calls.some(([p]) => p.endsWith('/student/detail') || p.includes('/file/'))).toBe(false);
    }
    const { service, transport } = fixture({ stStatus: 1, download: 1 });
    await expect(service.submissionResource('1001', '999', 'a'.repeat(64))).rejects.toMatchObject({ code: 'forbidden' });
    await expect(service.submissionResource('999', '8001', 'a'.repeat(64))).rejects.toMatchObject({ code: 'forbidden' });
    expect(transport.mock.calls.some(([p]) => p.endsWith('/homework/get'))).toBe(false);
  });
  it('keeps personal image references out of message-draft context', async () => {
    const { service } = fixture(); const scene = await service.scene(); const detail = await service.detail('1001');
    const student = { ...detail.students[0]!, submission: { status: 'available' as const, text: 'PRIVATE-ANSWER', teacherFeedback: '', message: 'AI尚未识别图中答案', attachments: [{ kind: 'image', count: 1 }], images: [{ ref: 'PRIVATE-IMAGE-REF', name: 'PRIVATE-FILENAME' }] } };
    const item = { ...detail, students: [student] };
    expect(JSON.stringify(projectContext(scene, 'message-draft', [item], '提交内容和批阅'))).not.toMatch(/PRIVATE/);
    const privateContext = JSON.stringify(projectContext(scene, 'private-assistance', [item], '提交内容和批阅'));
    expect(privateContext).toContain('PRIVATE-ANSWER'); expect(privateContext).not.toMatch(/PRIVATE-IMAGE-REF|PRIVATE-FILENAME/);
    expect(privateContext).toContain('AI尚未识别图中答案');
  });
  it('rejects unverified multi-page activities and duplicate class pages', async () => {
    await expect(fixture({ pages: 2 }).service.scene()).rejects.toMatchObject({ code: 'incomplete' });
    await expect(fixture({ total: 2 }).service.scene()).rejects.toMatchObject({ code: 'incomplete' });
  });
  it('rejects attachments outside the activity and closed download permission before reading file services', async () => {
    for (const download of [0, 1]) {
      const { service, transport } = fixture({ download });
      await expect(service.resource('1001', 'foreign-file')).rejects.toMatchObject({ code: 'forbidden' });
      expect(transport.mock.calls.some(([path]) => path.includes('/file/'))).toBe(false);
    }
    const { service, transport } = fixture({ download: 1 });
    await expect(service.resource('foreign-activity', 'foreign-file')).rejects.toMatchObject({ code: 'forbidden' });
    expect(transport.mock.calls.some(([path]) => path.endsWith('/homework/get'))).toBe(false);
  });
  it('distinguishes valid empty activities from incomplete roster', async () => {
    expect((await fixture({ empty: true }).service.scene()).activities).toEqual([]);
    await expect(fixture({ studentCount: 2 }).service.detail('1001')).rejects.toMatchObject({ code: 'incomplete' });
  });
  it('maps submission status, keeps drafts unsubmitted and null grades', async () => {
    const detail = await fixture({ stStatus: 1 }).service.detail('1001');
    expect(detail.students[0]).toMatchObject({ status: '已提交待批阅', grade: null });
    expect((await fixture({ stStatus: 1, draft: 1 }).service.detail('1001')).students[0].status).toContain('未提交');
    expect(JSON.stringify(detail)).not.toContain('PRIVATE');
  });
  it('reads exam slots through verified identities and restricts them to private context', async () => {
    const { service } = fixture({ exam: true }); const scene = await service.scene(); const detail = await service.detail('1001');
    expect(detail.students[0].grade).toBeNull();
    expect(detail.students[0].examAnswers?.questions[0]).toMatchObject({ position: 1, status: '未参与', score: null });
    const privateContext = projectContext(scene, 'private-assistance', [detail], '第1题学生作答');
    expect(privateContext.items.find((i) => i.key.includes(':exam-answers'))).toMatchObject({ sensitivity: 'student-personal' });
    expect(JSON.stringify(privateContext)).toContain('未确认实际成绩');
    expect(projectContext(scene, 'private-assistance', [detail], '第2题学生作答').items.find((i) => i.key.includes(':exam-answers'))?.value).not.toContain('第1题');
    expect(JSON.stringify(projectContext(scene, 'message-draft', [detail], '第1题学生作答'))).not.toContain('exam-answers');
    const foreign = fixture({ exam: true, foreignExam: true });
    await expect(foreign.service.detail('1001')).rejects.toMatchObject({ code: 'forbidden' });
    expect(foreign.transport.mock.calls.some(([p]) => p.includes('getAnswerMarkResult') || p.includes('batchGet'))).toBe(false);
  });
  it('preserves zero timestamps as absent and rejects milliseconds', () => {
    expect(fromSeconds(0)).toBeNull(); expect(fromSeconds(1789385400)).toBe('2026-09-14T11:30:00.000Z');
    expect(() => fromSeconds(1789385400000)).toThrow();
  });
  it('reads submitted homework only and excludes its content from group drafts', async () => {
    const { service } = fixture({ stStatus: 1 }); const scene = await service.scene(); const detail = await service.detail('1001');
    expect(detail.students[0].submission?.text).toBe('学生提交正文');
    expect(JSON.stringify(projectContext(scene, 'private-assistance', [detail], '第1讲作业作答与反馈'))).toContain('学生提交正文');
    expect(JSON.stringify(projectContext(scene, 'message-draft', [detail], '第1讲作业作答与反馈'))).not.toMatch(/学生提交正文|教师私有评语/);
    for (const options of [{ stStatus: 0 }, { stStatus: 1, draft: 1 }]) {
      const test = fixture(options); await test.service.detail('1001');
      expect(test.transport.mock.calls.some(([p]) => p.endsWith('/student/detail'))).toBe(false);
    }
  });
  it('uses current time, published state and 24h window for reminders', async () => {
    const source = await fixture().service.scene();
    const lesson = { ...source.activities[0], kind: 'classroom' as const };
    const scene = { ...source, activities: [lesson] };
    expect(projectDynamics(scene).stages[0].items[0].action).toBeDefined();
    for (const a of [{ ...lesson, cancelled: true }, { ...lesson, process: 2 }, { ...lesson, published: false }, { ...lesson, startsAt: new Date(now().valueOf() + 86400_001).toISOString() }]) {
      expect(projectDynamics({ ...scene, activities: [a] }).stages[0].items.some((i) => i.action)).toBe(false);
    }
  });
  it('excludes individual results from a group draft and retains complete chunked text', async () => {
    const { service } = fixture(); const scene = await service.scene(); const detail = await service.detail('1001');
    const description = '有理数运算步骤'.repeat(100);
    const draft = projectContext(scene, 'message-draft', [{ ...detail, description }]);
    expect(draft.items.some((i) => i.sensitivity === 'student-personal')).toBe(false);
    expect(draft.items.filter((i) => i.key.includes(':detail-')).map((i) => i.value).join('')).toBe(description);
    expect(projectContext(scene, 'private-assistance', [detail]).items.some((i) => i.sensitivity === 'student-personal')).toBe(true);
  });
  it('keeps a large course out of the runtime size gate with an explicit read window', async () => {
    const base = await fixture().service.scene();
    const scene = { ...base, activities: Array.from({ length: 53 }, (_, i) => ({ ...base.activities[0], id: String(i), kind: 'classroom' as const, name: `第${i + 1}讲 有理数` })) };
    const context = projectContext(scene, 'private-assistance');
    expect(JSON.stringify(context).length).toBeLessThan(7800);
    expect(context.sources).toHaveLength(1);
    expect(context.items.every((item) => context.sources.some((source) => item.sourceRef === source.sourceRef))).toBe(true);
    expect(context.items.some((item) => item.label === '明细读取范围' && item.value.includes('最近三堂'))).toBe(true);
  });
  it('preserves original question position in a filtered lookup', async () => {
    const { service } = fixture(); const scene = await service.scene(); const detail = await service.detail('1001');
    const questions = ['100', '200', '300'].map((id) => ({ id, typeCode: 1, content: `题干${id}`, options: ['1', '2'], answers: ['1'], analysis: '解析', hasImage: false }));
    const context = projectContext(scene, 'private-assistance', [{ ...detail, questions }], '第2题解析');
    expect(context.items.filter(i => i.key.includes(':question-')).map(i => i.label)).toEqual(['第2题（试题 200）']);
    expect(JSON.stringify(projectContext(scene, 'message-draft', [{ ...detail, questions }], '第2题解析'))).not.toContain('题干200');
  });
  it('signs JSON by UTF8 byte position and form values by key', () => {
    const request = signedRequest({ a: '中' }, false, '123', 'fake-test-secret', 1700000007);
    const raw = Buffer.from(request.body); const expected = createHash('md5').update(Buffer.concat([raw.subarray(0, 7), Buffer.from('1700000007'), raw.subarray(7)])).digest('hex');
    expect(request.headers['X-EEO-SIGN']).toBe(expected);
    const form = signedRequest({ b: '2', a: '1' }, true, '123', 'fake-test-secret', 100);
    expect(form.headers['X-EEO-SIGN']).toBe(createHash('md5').update('a=1&b=2&timeStamp=100&key=fake-test-secret').digest('hex'));
  });
  it('does not treat the classroom-chat code=1 as course/LMS success', () => {
    expect(() => unwrap({ code: 1, msg: 'OK', data: [] })).toThrow();
    expect(unwrap({ error_info: { errno: 1 }, data: [] })).toEqual([]);
  });
  it('rejects hostile origin, DNS rebinding host and remote access', () => {
    const request = (host: string, origin?: string, remoteAddress = '127.0.0.1') => ({ headers: { host, origin }, socket: { remoteAddress } }) as IncomingMessage;
    expect(allowsClassInRequest(request('127.0.0.1:4174', 'http://127.0.0.1:4174'))).toBe(true);
    expect(allowsClassInRequest(request('evil.test:4174'))).toBe(false);
    expect(allowsClassInRequest(request('127.0.0.1:4174', 'https://evil.test'))).toBe(false);
    expect(allowsClassInRequest(request('127.0.0.1:4174', undefined, '192.168.1.2'))).toBe(false);
  });
});
