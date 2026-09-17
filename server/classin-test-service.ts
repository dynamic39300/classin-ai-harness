import { readClassroomResult } from './classin-test-reports.ts';
import { readHistoricalAttendance } from './classin-test-attendance.ts';
import { aggregateQuestionResults } from './classin-test-question-aggregation.ts';
import { buildLearningSummary, shanghaiWeek } from './classin-test-learning.ts';
import { readImageText } from './classin-image-ocr.ts';
import { readCapturedIm, readCourseProgress, readLessonReview, type ClassInLessonReview } from './classin-test-copilot.ts';
import type { ImChatReadResult } from '../src/contracts/workbuddy/im-chat-context.ts';
import { readClassInReplay, authorizeClassInReplay } from './classin-test-replay.ts';
import { openClassInReplayStream, type ClassInReplayStream } from './classin-test-replay-stream.ts';
import { readHomeworkSubmission, readHomeworkImage } from './classin-test-submissions.ts';
import { readExamAnswers } from './classin-test-exam-answers.ts';
import { questionImageRefs, readQuestionImage } from './classin-test-question-images.ts';
import { readClassInResource } from './classin-test-resources.ts';
import { readPdfText } from './classin-pdf-text.ts';
import { createHash } from 'node:crypto';
import type { ClassInActivity, ClassInActivityDetail, ClassInActivityKind, ClassInCourseProgress, ClassInHistoricalAttendance, ClassInLearningSummary, ClassInQuestion, ClassInQuestionAggregation, ClassInReadPort, ClassInResolvedHomeworkQuestion, ClassInScene } from '../src/contracts/classin-test/index.ts';
import { ClassInError, createClassInTransport, object, TEST_SCOPE, type ClassInTransport } from './classin-test-transport.ts';
const kinds: Record<number, ClassInActivityKind> = { 1: 'classroom', 2: 'homework', 3: 'exam', 4: 'recording', 5: 'material' };
const paths = { classroom: 'class', homework: 'homework', exam: 'exam', recording: 'recordClass', material: 'learningMaterials' };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
function rows(value: unknown) { if (!Array.isArray(value)) throw new ClassInError('schema_error', '接口列表结构发生变化。'); return value.map(object); }
function id(value: unknown): string { if (!/^\d+$/.test(String(value))) throw new ClassInError('schema_error', '业务对象缺少有效 ID。'); return String(value); }
function label(value: unknown): string { if (typeof value !== 'string') throw new ClassInError('schema_error', '业务对象缺少名称。'); return value; }
function count(value: unknown): number { const n = Number(value); if (value === null || value === undefined || !Number.isSafeInteger(n) || n < 0) throw new ClassInError('schema_error', '接口计数不完整。'); return n; }
export function fromSeconds(value: unknown): string | null {
  if (value === undefined || value === null || value === '' || Number(value) === 0) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000_000) throw new ClassInError('schema_error', '活动时间不符合秒级时间戳合同。');
  return new Date(n * 1000).toISOString();
}
export function plain(value: unknown): string {
  return typeof value === 'string' ? value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim() : '';
}
function files(value: unknown) {
  if (!value) return [];
  try { return rows(typeof value === 'string' ? JSON.parse(value) : value); }
  catch { throw new ClassInError('schema_error', '资源引用结构发生变化。'); }
}
function activity(value: Record<string, unknown>, unitId: string): ClassInActivity {
  if (id(value.unitId) !== unitId || id(value.categoryId) !== TEST_SCOPE.categoryId) throw new ClassInError('forbidden', '活动归属与授权课程不一致。');
  const kind = kinds[Number(value.type)];
  if (!kind) throw new ClassInError('unsupported', '课程出现尚未验证的活动类型。');
  const summary = Object.fromEntries(Object.entries(object(value.status)).filter(([key, v]) => ['studentTotal', 'submitTotal', 'correctTotal', 'checkTotal', 'onClassTotal', 'topicAmount', 'waitJudgeTotal'].includes(key) && typeof v === 'number' && v >= 0)) as Record<string, number>;
  return { id: id(value.activityId), bizId: id(value.bizId), unitId, categoryId: id(value.categoryId), name: label(value.name), kind,
    startsAt: fromSeconds(value.startTime), endsAt: fromSeconds(value.endTime), published: value.publishFlag === 2, cancelled: value.classStatus === 4, process: count(value.processFlag), summary };
}
export interface ClassInTestService extends ClassInReadPort {
  replayStream(activityId: string, ref: string, range: string | undefined, signal: AbortSignal): Promise<ClassInReplayStream>;
  courseProgress?(): Promise<ClassInCourseProgress>;
  lessonReview?(activityId: string): Promise<ClassInLessonReview>;
  capturedIm?(): Promise<ImChatReadResult>;
  historicalAttendance?(): Promise<ClassInHistoricalAttendance>;
  questionAggregation?(): Promise<ClassInQuestionAggregation>;
  learningSummary?(): Promise<ClassInLearningSummary>;
  homeworkQuestion?(activityId: string, position: number): Promise<ClassInResolvedHomeworkQuestion>;
}
export function createClassInTestService(transport: ClassInTransport = createClassInTransport(), now = () => new Date()): ClassInTestService {
  let inFlight: Promise<ClassInScene> | undefined;
  async function readScene(): Promise<ClassInScene> {
    const classes: Record<string, unknown>[] = []; let total = Infinity;
    for (let page = 1; classes.length < total; page += 1) {
      if (page > 20) throw new ClassInError('incomplete', '班级分页超过安全边界，尚未取全。');
      const response = object(await transport('/course/app/member/course_list', { states: [0], page, pageSize: 50, identitys: [3, 192], processing: 1 }, false));
      total = count(response.total); const batch = rows(response.list);
      if (batch.length === 0 && classes.length < total) throw new ClassInError('incomplete', '班级列表缺少后续页。');
      classes.push(...batch);
      if (new Set(classes.map((c) => id(c.courseId))).size !== classes.length || classes.length > total) throw new ClassInError('incomplete', '班级分页出现重复或总量变化，请刷新。');
    }
    const selected = classes.find((c) => id(c.courseId) === TEST_SCOPE.classId);
    if (!selected || id(selected.schoolUid) !== TEST_SCOPE.schoolId || ![3, 192].includes(Number(selected.identity))) throw new ClassInError('forbidden', '当前教师无权访问已配置的测试班级。');
    const [categoriesValue, membersValue, unitsValue] = await Promise.all([
      transport('/lms/app/category/list', { courseId: TEST_SCOPE.classId }),
      transport('/course/app/getCourseMember', { SID: Number(TEST_SCOPE.schoolId), clientCourseId: Number(TEST_SCOPE.classId), identity: [1, 2, 3, 4] }, false),
      transport('/lms/app/course/unitList', { courseId: TEST_SCOPE.classId, categoryId: TEST_SCOPE.categoryId, sort: 'asc' }),
    ]);
    const selectedCourse = rows(object(categoriesValue).list).find((c) => id(c.categoryId) === TEST_SCOPE.categoryId);
    if (!selectedCourse) throw new ClassInError('forbidden', '当前班级下找不到授权的目标课程。');
    const members = rows(membersValue).map((m) => ({ id: id(m.memberUid), name: plain(m.courseNickname) || plain(m.userName) || `学生 ${id(m.memberUid)}`, identity: count(m.identity) }));
    if (new Set(members.map((m) => m.id)).size !== members.length) throw new ClassInError('incomplete', '班级成员列表包含重复记录。');
    const units = rows(object(unitsValue).list).map((u) => {
      if (id(u.categoryId) !== TEST_SCOPE.categoryId) throw new ClassInError('forbidden', '单元归属与课程不一致。');
      return { id: id(u.unitId), name: label(u.name), count: count(u.activityCount) };
    });
    if (new Set(units.map((u) => u.id)).size !== units.length) throw new ClassInError('incomplete', '单元列表包含重复记录。');
    const activities: ClassInActivity[] = [];
    if (units.length) {
      const response = object(await transport('/lms/app/course/unitActivityList', { courseId: TEST_SCOPE.classId, categoryId: TEST_SCOPE.categoryId, SID: TEST_SCOPE.schoolId, unitIds: JSON.stringify(units.map((u) => Number(u.id))), offset: 0, limit: 100, sort: 'asc' }));
      const groups = rows(response.list); const seen = new Set<string>();
      for (const group of groups) {
        const unitId = id(group.unitId); const unit = units.find((u) => u.id === unitId);
        if (!unit || seen.has(unitId)) throw new ClassInError('incomplete', '活动列表单元映射不完整。');
        seen.add(unitId);
        if (count(group.pageTotal) > 1) throw new ClassInError('incomplete', '活动存在尚未验证的多页结果，已停止使用不完整数据。');
        const batch = rows(group.activities);
        if (batch.length !== unit.count) throw new ClassInError('incomplete', '单元活动数量发生变化或未取全，请刷新。');
        activities.push(...batch.map((a) => activity(a, unitId)));
      }
      if (units.some((u) => u.count > 0 && !seen.has(u.id)) || new Set(activities.map((a) => a.id)).size !== activities.length) throw new ClassInError('incomplete', '课程活动缺失或重复，无法确认完整性。');
    }
    const contents = { environment: 'classin-test' as const, teacher: { id: `classin-test:teacher:${TEST_SCOPE.uid}`, name: '测试老师' }, schoolRef: `classin-test:school:${TEST_SCOPE.schoolId}`,
      class: { id: TEST_SCOPE.classId, name: label(selected.courseName) }, course: { id: TEST_SCOPE.categoryId, name: label(selectedCourse.name) }, units, activities, members,
      complete: true as const, capabilities: { ordinaryIm: 'unavailable' as const, realtimeAttendance: 'unverified' as const } };
    return { ...contents, version: digest(contents), capturedAt: now().toISOString() };
  }
  function scene() {
    if (!inFlight) {
      let timer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new ClassInError('timeout', '读取课程现场超时，请刷新。')), 45_000); });
      inFlight = Promise.race([readScene(), deadline]).finally(() => { clearTimeout(timer); inFlight = undefined; });
    }
    return inFlight;
  }
  function verifySource(source: Record<string, unknown>, selected: ClassInActivity) {
    if (id(source.id) !== selected.id || id(source.courseId) !== TEST_SCOPE.classId || id(source.categoryId) !== TEST_SCOPE.categoryId || id(source.unitId) !== selected.unitId) throw new ClassInError('forbidden', '详情返回的业务归属不一致。');
  }
  async function resourceFromSource(selected: ClassInActivity, source: Record<string, unknown>, resourceId: string) {
    if (['homework', 'material'].includes(selected.kind) && source.isDownload !== 1) throw new ClassInError('forbidden', '该活动未开放附件下载。');
    const refs = ['image', 'video', 'docs'].flatMap((key) => files(source[key])).filter((f) => String(f.lmsFileId) === resourceId);
    if (refs.length !== 1) throw new ClassInError('forbidden', '文件不属于当前活动的可读取附件。');
    const file = refs[0]!;
    return readClassInResource(transport, { activityId: selected.id, resourceId: id(file.lmsFileId), fileId: id(file.fileId), name: plain(file.fileName) || '教学资源' });
  }
  async function resource(activityId: string, resourceId: string) {
    const current = await scene(); const selected = current.activities.find((a) => a.id === activityId);
    if (!selected) throw new ClassInError('forbidden', '活动不属于当前授权课程。');
    const source = object(await transport(`/lms/app/activity/${paths[selected.kind]}/get`, { activityId, courseId: TEST_SCOPE.classId }, selected.kind !== 'exam'));
    verifySource(source, selected);
    return resourceFromSource(selected, source, resourceId);
  }
  async function replayStream(activityId: string, ref: string, range: string | undefined, signal: AbortSignal) {
    signal.throwIfAborted();
    const current = await scene(); const selected = current.activities.find((a) => a.id === activityId);
    if (!selected || selected.kind !== 'classroom' || !selected.published || selected.cancelled) throw new ClassInError('forbidden', '回放不属于当前可读取课堂。');
    const source = object(await transport('/lms/app/activity/class/get', { activityId, courseId: TEST_SCOPE.classId }));
    verifySource(source, selected);
    if (id(source.bizId) !== selected.bizId) throw new ClassInError('forbidden', '课堂业务引用已变化。');
    signal.throwIfAborted();
    const grant = await authorizeClassInReplay(transport, selected.bizId, ref);
    return openClassInReplayStream(grant, range, signal);
  }
  async function submissionResource(activityId: string, studentId: string, imageRef: string) {
    const current = await scene(); const selected = current.activities.find((a) => a.id === activityId);
    if (!selected || selected.kind !== 'homework' || !selected.published || selected.cancelled || !current.members.some((m) => m.id === studentId && m.identity === 1)) throw new ClassInError('forbidden', '答卷不属于当前授权课程和学生。');
    const [detailValue, rosterValue] = await Promise.all([
      transport('/lms/app/activity/homework/get', { activityId, courseId: TEST_SCOPE.classId }, true),
      transport('/lms/app/activity/homework/students', { activityId, courseId: TEST_SCOPE.classId }),
    ]);
    const source = object(detailValue); verifySource(source, selected);
    if (id(source.bizId) !== selected.bizId || source.isDownload !== 1) throw new ClassInError('forbidden', '作业已变化或当前下载权限尚未开放。');
    const roster = rows(rosterValue);
    if (roster.length !== count(source.studentTotal) || new Set(roster.map((s) => id(s.studentUid))).size !== roster.length) throw new ClassInError('incomplete', '当前作业分配名单不完整。');
    const student = roster.find((s) => id(s.studentUid) === studentId);
    if (!student || student.isDraft !== 0 || ![1, 2].includes(Number(student.stStatus))) throw new ClassInError('forbidden', '该学生尚无可读取的正式答卷。');
    return readHomeworkImage(transport, { activityId, homeworkId: selected.bizId, studentId, submissionId: id(student.stuHomeworkId) }, imageRef);
  }
  async function questionResource(activityId: string, topicId: string, imageRef: string) {
    const current = await scene(); const selected = current.activities.find((a) => a.id === activityId);
    if (!selected || selected.kind !== 'exam' || !selected.published || selected.cancelled) throw new ClassInError('forbidden', '题图不属于当前授权的已发布测验。');
    const source = object(await transport('/lms/app/activity/exam/get', { activityId, courseId: TEST_SCOPE.classId }, false));
    verifySource(source, selected);
    if (id(source.bizId) !== selected.bizId || source.publishFlag !== 2 || source.isDeleted !== 0) throw new ClassInError('forbidden', '测验已变化或无法核实可见状态。');
    return readQuestionImage(transport, source, { activityId, topicId, imageRef });
  }
  async function detail(activityId: string): Promise<ClassInActivityDetail> {
    const current = await scene(); const selected = current.activities.find((a) => a.id === activityId);
    if (!selected) throw new ClassInError('forbidden', '活动不属于当前授权课程。');
    const prefix = `/lms/app/activity/${paths[selected.kind]}`; const params = { activityId, courseId: TEST_SCOPE.classId };
    const [detailValue, studentsValue] = await Promise.all([transport(`${prefix}/get`, params, selected.kind !== 'exam'), transport(`${prefix}/students`, params)]);
    const source = object(detailValue);
    verifySource(source, selected);
    const studentRows = rows(studentsValue);
    if (studentRows.length !== count(source.studentTotal) || new Set(studentRows.map((s) => id(s.studentUid))).size !== studentRows.length) throw new ClassInError('incomplete', '活动分配名单未取全。');
    const states: Record<string, Record<number, string>> = { homework: { 0: '未提交', 1: '已提交待批阅', 2: '已批阅' }, exam: { 0: '未作答', 3: '作答中', 6: '已批阅', 9: '已交卷待批阅' }, recording: { 0: '未开始', 1: '学习中', 2: '已完成' } };
    const students: ClassInActivityDetail['students'][number][] = studentRows.map((s) => {
      const uid = id(s.studentUid); const member = current.members.find((m) => m.id === uid);
      const status = selected.kind === 'homework' && s.isDraft === 1 ? '作答草稿（未提交）' : states[selected.kind]?.[Number(selected.kind === 'recording' ? s.learnState : s.stStatus)] ?? '已分配；参与结果待核对';
      return { id: uid, name: member?.name ?? `学生 ${uid}（未在当前班级名单中）`, status,
        grade: (selected.kind !== 'exam' || s.stStatus === 6) && s.isScore === 1 && typeof s.showGrade === 'string' && s.showGrade.trim() ? s.showGrade : null,
        progress: selected.kind === 'recording' && typeof s.learnRate === 'number' ? s.learnRate : null,
        durationSeconds: selected.kind === 'recording' && typeof s.duration === 'number' ? s.duration : null };
    });
    if (selected.kind === 'homework') {
      const submitted = students.filter((s) => ['已提交待批阅', '已批阅'].includes(s.status) && current.members.some((m) => m.id === s.id && m.identity === 1));
      for (let offset = 0; offset < submitted.length; offset += 4) {
        const batch = submitted.slice(offset, offset + 4);
        await Promise.all(batch.map(async (student) => {
          const submission = await readHomeworkSubmission(transport, { activityId, homeworkId: selected.bizId, studentId: student.id }, plain);
          const index = students.findIndex((s) => s.id === student.id);
          students[index] = { ...student, submission };
        }));
      }
    }
    const fields: { label: string; value: string }[] = [{ label: '分配学生数', value: String(studentRows.length) }, { label: '评分', value: source.isScore === 1 ? `满分 ${source.maxScore}` : '不评分' }];
    if (selected.kind === 'homework' && selected.summary.correctTotal !== undefined && selected.summary.correctTotal !== students.filter((s) => s.status === '已批阅').length) {
      fields.push({ label: '统计差异', value: '列表批阅统计与学生明细不一致，批阅是否完成需在原生客户端核对；当前展示各接口原有口径。' });
    }
    if (selected.kind === 'classroom') {
      fields.push({ label: '课堂结果', value: '排课、实际授课与报告生成是不同状态；不据此推断实时全勤。' });
    }
    let questions: ClassInQuestion[] | undefined;
    if (selected.kind === 'exam') {
      if (id(source.bizId) !== selected.bizId) throw new ClassInError('forbidden', '测验详情与活动业务ID不一致。');
      let paper: Record<string, unknown>;
      try { paper = object(typeof source.paperInfo === 'string' ? JSON.parse(source.paperInfo) : source.paperInfo); }
      catch { throw new ClassInError('schema_error', '试卷结构无法读取。'); }
      const refs = rows(paper.paper).flatMap((part) => rows(part.topicInfos).map((topic) => ({ topicId: Number(id(topic.topicId)), topicSource: count(topic.topicSource) })));
      if (!refs.length || refs.length > 100 || new Set(refs.map((r) => r.topicId)).size !== refs.length) throw new ClassInError('incomplete', '试卷题量为空、重复或超出当前读取边界。');
      const response = object(await transport('/question-bank-business-service/topic/batchGet', { topicQuery: JSON.stringify(refs) }));
      const topics = rows(response.list);
      if (topics.length !== refs.length || new Set(topics.map((t) => id(t.topicId))).size !== refs.length || topics.some((t) => !refs.some((r) => String(r.topicId) === id(t.topicId)))) throw new ClassInError('incomplete', '试题返回集合与当前授权试卷不一致。');
      questions = refs.map((ref) => {
        const t = topics.find((t) => id(t.topicId) === String(ref.topicId))!;
        if (!Array.isArray(t.options) || !Array.isArray(t.answer)) throw new ClassInError('schema_error', '试题选项或答案结构发生变化。');
        return { id: id(t.topicId), typeCode: count(t.topicType), content: plain(t.content), options: t.options.map(plain), answers: t.answer.map(plain), analysis: plain(t.analyse), hasImage: typeof t.content === 'string' && /<img\b/i.test(t.content), images: questionImageRefs(activityId, t, ref.topicSource) };
      });
      const allowedIds = students.filter((s) => current.members.some((m) => m.id === s.id && m.identity === 1)).map((s) => s.id);
      const answers = await readExamAnswers(transport, { examId: selected.bizId, studentIds: allowedIds,
        topics: refs.map((ref, i) => ({ ...ref, typeCode: questions![i]!.typeCode })) }, plain);
      students.forEach((student, i) => {
        if (answers.has(student.id)) students[i] = { ...student, examAnswers: answers.get(student.id) };
      });
      fields.push({ label: '试卷', value: `已读取 ${questions.length} 道试题；逐题作答见学生详情。图片内容尚需原图读取，不据空答题槽判断实际得分。` });
    }
    const [classroomResult, replay] = await Promise.all([
      selected.kind === 'classroom' && selected.process === 2 ? readClassroomResult(transport, selected.bizId) : undefined,
      selected.kind === 'classroom' ? readClassInReplay(transport, selected.bizId) : undefined,
    ]);
    const resources: ClassInActivityDetail['resources'][number][] = ['image', 'video', 'audio', 'docs'].flatMap((key) => files(source[key]).map((f) => ({ id: key !== 'audio' && f.lmsFileId ? id(f.lmsFileId) : undefined, name: plain(f.fileName) || '教学资源', kind: key,
      state: '活动附件已存在；打开时重新核对归属、权限和实际文件。' })));
    if (selected.kind === 'material') for (let index = 0; index < resources.length; index++) {
      const r = resources[index]!;
      if (r.id && r.kind === 'docs' && /\.pdf$/i.test(r.name)) {
        try {
          const file = await resourceFromSource(selected, source, r.id);
          if (file.mimeType !== 'application/pdf') throw new ClassInError('schema_error', '资料文件格式发生变化。');
          resources[index] = { ...r, document: await readPdfText(file.bytes) };
        } catch (error) {
          if (error instanceof ClassInError && error.code === 'forbidden') throw error;
          resources[index] = { ...r, document: { status: 'unavailable', text: '', pages: null, message: '本次资料正文未取得，请重试或打开原文件核对。' } };
        }
      }
    }
    const content = { activity: selected, questions, classroomResult, replay, description: plain(source.homeworkDesc || source.describe || source.paperDec), fields, resources, students };
    return { ...content, capturedAt: now().toISOString(), version: digest(content) };
  }
  async function courseProgress() { return readCourseProgress(transport, await scene(), now()); }
  async function lessonReview(activityId: string) {
    const current = await scene(); const selected = current.activities.find((item) => item.id === activityId);
    if (!selected) throw new ClassInError('forbidden', '课堂不属于当前授权课程。');
    return readLessonReview(transport, current, selected);
  }
  async function capturedIm() { return readCapturedIm(await scene()); }
  async function historicalAttendance() { return readHistoricalAttendance(transport, await scene()); }
  async function questionAggregation() {
    const current = await scene(); const captured = Date.parse(current.capturedAt); const lower = captured - 30 * 86400_000;
    const ended = current.activities.filter((item) => item.published && !item.cancelled && item.process === 2 && item.endsAt && Date.parse(item.endsAt) >= lower && Date.parse(item.endsAt) <= captured);
    const exams = ended.filter((item) => item.kind === 'exam' && (item.summary.topicAmount ?? 0) > 0).sort((left, right) => (right.endsAt ?? '').localeCompare(left.endsAt ?? '')).slice(0, 5);
    if (!exams.length) throw new ClassInError('unsupported', '最近30天没有可核验逐题判定的已结束测验。');
    const details = [] as ClassInActivityDetail[];
    const excluded = ended.filter((item) => item.kind === 'homework').map((item) => ({ id: item.id, name: item.name, reason: '作业接口没有可完整核验的结构化逐题判定，未从总分、图片或自由文本反推。' }));
    for (const exam of exams) {
      const result = await detail(exam.id);
      if (!result.questions?.length || result.students.some((student) => student.examAnswers?.status !== 'available')) {
        excluded.push({ id: exam.id, name: exam.name, reason: '测验逐题题面或学生判定未完整读取，已排除。' });
      } else details.push(result);
    }
    if (!details.length) throw new ClassInError('incomplete', '最近测验的逐题证据均不完整，不能生成统计。');
    return aggregateQuestionResults(details, current.capturedAt, excluded);
  }
  async function learningSummary() {
    const current = await scene(); const period = shanghaiWeek(current.capturedAt); const start = Date.parse(period.from); const end = Date.parse(period.end); const captured = Date.parse(current.capturedAt);
    const candidates = current.activities.filter((item) => item.published && !item.cancelled && ['homework', 'exam', 'recording'].includes(item.kind) && item.startsAt && item.endsAt &&
      ((['homework', 'exam'].includes(item.kind) && Date.parse(item.endsAt) >= start && Date.parse(item.startsAt) < end) || (item.kind === 'recording' && Date.parse(item.startsAt) <= captured && Date.parse(item.endsAt) >= start)));
    if (candidates.length > 16) throw new ClassInError('unsupported', '本周活动超过当前聚合边界，请缩小课程或周期。');
    const details: ClassInActivityDetail[] = [];
    for (let offset = 0; offset < candidates.length; offset += 3) details.push(...await Promise.all(candidates.slice(offset, offset + 3).map((item) => detail(item.id))));
    return buildLearningSummary(current, details, await historicalAttendance());
  }
  async function homeworkQuestion(activityId: string, position: number): Promise<ClassInResolvedHomeworkQuestion> {
    if (!Number.isSafeInteger(position) || position < 1 || position > 20) throw new ClassInError('unsupported', '题号超出当前读取边界。');
    const current = await scene(); const selected = current.activities.find((item) => item.id === activityId);
    if (!selected || selected.kind !== 'homework' || !selected.published || selected.cancelled) throw new ClassInError('forbidden', '题目不属于当前授权作业。');
    const source = object(await transport('/lms/app/activity/homework/get', { activityId, courseId: TEST_SCOPE.classId }, true)); verifySource(source, selected);
    const images = files(source.image); const image = images[position - 1];
    if (!image?.lmsFileId || !image.fileId) throw new ClassInError('unsupported', `第${position}题没有可唯一定位的图片题面。`);
    const file = await resourceFromSource(selected, source, id(image.lmsFileId));
    if (!file.mimeType.startsWith('image/')) throw new ClassInError('schema_error', '题目资源不是已验证图片格式。');
    const text = await readImageText(file.bytes, /jpe?g/i.test(file.mimeType) ? '.jpg' : '.png');
    const contents = { activity: selected, position, resourceId: id(image.lmsFileId), resourceName: plain(image.fileName) || `第${position}题题图`, text, textSource: 'apple-vision-ocr' as const };
    return { ...contents, capturedAt: now().toISOString(), version: digest(contents) };
  }
  return { scene, detail, resource, replayStream, submissionResource, questionResource, courseProgress, lessonReview, capturedIm, historicalAttendance, questionAggregation, learningSummary, homeworkQuestion };
}
