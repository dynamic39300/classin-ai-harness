import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { projectCatalog, projectContext, projectDynamics, activityRef } from '../src/domain/classin-test/projections.ts';
import { createClassInTestService, type ClassInTestService } from './classin-test-service.ts';
import { ClassInError } from './classin-test-transport.ts';
import { resourceByteRange } from './classin-test-resources.ts';
import type { ClassInCopilotQuestionId, ClassInCopilotToolId } from '../src/contracts/classin-test/copilot-context.ts';
import type { ImChatReadResult } from '../src/contracts/workbuddy/im-chat-context.ts';
import { selectImChatContext } from '../src/domain/workbuddy/im-chat-context.ts';

export function routeQuestion(query: string, studentNames: readonly string[] = []): { questionId: ClassInCopilotQuestionId; tools: ClassInCopilotToolId[] } | undefined {
  if (/课程.*(哪些|进度|学到)|有哪些课程|分别学到/.test(query)) return { questionId: 'A1', tools: ['read_course_progress'] };
  if (/接下来.*课|下一(节)?课|什么时候上/.test(query)) return { questionId: 'A2', tools: ['list_course_activities'] };
  if (/多少(名|个)?学生|学生人数/.test(query)) return { questionId: 'A3', tools: ['read_class_roster'] };
  if (/配套|同单元.*(活动|资料)/.test(query)) return { questionId: 'A4', tools: ['read_lesson_companions'] };
  if (/最近.*(迟到|缺席)|哪些同学.*(迟到|缺席)|迟到或缺席/.test(query)) return { questionId: 'B2', tools: ['read_class_attendance'] };
  if (/录播.*(学到|进度|看了|完成)|这节录播/.test(query)) return { questionId: 'B3', tools: ['read_recording_progress'] };
  if (/到课|出勤/.test(query)) return { questionId: 'B1', tools: ['read_class_attendance'] };
  if (/没交|未交|批完|批阅/.test(query)) return { questionId: 'C2', tools: ['read_homework_students'] };
  if (/作业.*(要求|截止|做什么)|要做什么/.test(query)) return { questionId: 'C1', tools: ['read_activity'] };
  if (/(作业|测验|题).*(错得多|高频错|容易错)|哪些题.*(错|错误)/.test(query)) return { questionId: 'C5', tools: ['aggregate_question_results'] };
  if (/学情.*家长|写.*家长|给家长.*(话|消息)/.test(query)) return { questionId: 'D5', tools: ['read_student_learning'] };
  if (/(还有|哪些).*(任务|作业|测验|录播).*(没完成|未完成)|未完成.*任务/.test(query)) return { questionId: 'D2', tools: ['read_student_learning'] };
  if (studentNames.some((name) => query.includes(name)) && /(最近|本周|这周).*(学习情况|学情)/.test(query)) return { questionId: 'D1', tools: ['read_student_learning'] };
  if (/(同学|学生).*(最近|本周).*(学习情况|学情)|了解.*学习情况/.test(query)) return { questionId: 'D1', tools: ['read_student_learning'] };
  if (/学习资料.*(方法|整理)|资料里.*(方法|三点)|这份资料/.test(query)) return { questionId: 'E3', tools: ['read_material_content'] };
  if (/(本周|这周).*(班级|我们班).*(学习情况|学情)|总结.*班.*(本周|这周)/.test(query)) return { questionId: 'E4', tools: ['read_weekly_learning'] };
  if (/刚才.*(整理|内容).*(消息|通知)|整理成一条消息/.test(query)) return { questionId: 'E5', tools: ['reuse_conversation_artifact'] };
  if (/课堂回顾|讲的内容|讲了什么|课堂总结/.test(query)) return { questionId: 'E2', tools: ['read_class_resources', 'read_class_transcript', 'read_ai_analysis'] };
  if (/报告|回放|板书/.test(query)) return { questionId: 'E1', tools: ['read_class_resources'] };
  if (/讲解.*(作业|测验).*(第\s*\d+\s*题|题)|作业.*题.*(怎么做|讲解)/.test(query)) return { questionId: 'F2', tools: ['read_im_history', 'resolve_referenced_question'] };
  if (/(回复|起草).*(群里|同学|小石头|问题)|根据群里.*回复/.test(query)) return { questionId: 'F3', tools: ['read_im_history', 'read_reply_context'] };
  if (/群聊|群里|聊天要点|聊天.*总结/.test(query)) return { questionId: 'F1', tools: ['read_im_history'] };
}

function readChineseOrdinal(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return String(Number(value));
  const digits: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (value === '十') return '10';
  if (value.startsWith('十') && digits[value[1]!]) return String(10 + digits[value[1]!]!);
  if (value.endsWith('十') && digits[value[0]!]) return String(digits[value[0]!]! * 10);
  if (value.includes('十') && digits[value[0]!] && digits[value[2]!]) return String(digits[value[0]!]! * 10 + digits[value[2]!]!);
  return digits[value]?.toString();
}

function ordinalFrom(text: string, noun: '讲' | '题'): string | undefined {
  return readChineseOrdinal(text.match(new RegExp(`第\\s*([0-9一二三四五六七八九十]+)\\s*${noun}`))?.[1]);
}
const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
export function allowsClassInRequest(req: IncomingMessage): boolean {
  const remote = req.socket.remoteAddress;
  if (!remote || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false;
  try {
    const expected = new URL(`http://${req.headers.host}`);
    if (!localHosts.has(expected.hostname)) return false;
    if (req.headers.origin && req.headers.origin !== expected.origin) return false;
    if (req.headers['sec-fetch-site'] === 'cross-site') return false;
    return true;
  } catch { return false; }
}
export function classInTestMiddleware(service: ClassInTestService = createClassInTestService()) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/classin-test/')) return next();
    const requestId = randomUUID(); const started = Date.now();
    const send = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify({ ...value as object, requestId, elapsedMs: Date.now() - started })); };
    try {
      if (!allowsClassInRequest(req)) throw new ClassInError('forbidden', '测试连接仅允许本机同源访问。');
      if (req.method !== 'GET') throw new ClassInError('unsupported', '该入口只支持读取；普通 IM 发送尚未接通。');
      const url = new URL(req.url, 'http://localhost');
      const op = url.pathname.slice('/api/classin-test/'.length);
      const allowedParams = op === 'context' ? ['focus', 'query', 'use', 'referenceId'] : op === 'detail' ? ['activityId'] : op === 'resource' ? ['activityId', 'resourceId'] : op === 'question-resource' ? ['activityId', 'topicId', 'imageRef'] : op === 'submission-resource' ? ['activityId', 'studentId', 'imageRef'] : op === 'replay-resource' ? ['activityId', 'replayRef'] : [];
      if ([...url.searchParams.keys()].some((key) => !allowedParams.includes(key))) throw new ClassInError('forbidden', '不能覆盖服务端身份或业务范围。');
      if (!['scene', 'detail', 'resource', 'question-resource', 'submission-resource', 'replay-resource', 'dynamics', 'catalog', 'context'].includes(op)) throw new ClassInError('unsupported', '未接入的业务读取。');
      if (op === 'replay-resource') {
        const controller = new AbortController(); const cancel = () => controller.abort();
        res.once('close', cancel);
        try {
          const file = await service.replayStream(url.searchParams.get('activityId') ?? '', url.searchParams.get('replayRef') ?? '', req.headers.range, controller.signal);
          if (controller.signal.aborted) { file.body?.destroy(); return; }
          res.writeHead(file.status, { ...file.headers, 'X-Request-ID': requestId, 'X-Read-Setup-Ms': String(Date.now() - started) });
          if (!file.body) return res.end();
          await pipeline(file.body, res, { signal: controller.signal });
          return;
        } finally { controller.abort(); res.off('close', cancel); }
      }
      if (op === 'resource' || op === 'submission-resource' || op === 'question-resource') {
        const file = op === 'question-resource' ? await service.questionResource(url.searchParams.get('activityId') ?? '', url.searchParams.get('topicId') ?? '', url.searchParams.get('imageRef') ?? '') : op === 'resource' ? await service.resource(url.searchParams.get('activityId') ?? '', url.searchParams.get('resourceId') ?? '') : await service.submissionResource(url.searchParams.get('activityId') ?? '', url.searchParams.get('studentId') ?? '', url.searchParams.get('imageRef') ?? '');
        const headers: Record<string, string> = { 'Content-Type': file.mimeType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, '%27')}` };
        let range;
        try { range = resourceByteRange(req.headers.range, file.bytes.length); }
        catch { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${file.bytes.length}`, 'Content-Length': '0' }); return res.end(); }
        const bytes = range ? file.bytes.subarray(range.start, range.end + 1) : file.bytes;
        if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${file.bytes.length}`;
        res.writeHead(range ? 206 : 200, { ...headers, 'Content-Length': String(bytes.length) }); return res.end(bytes);
      }
      if (op === 'detail') return send(200, { data: await service.detail(url.searchParams.get('activityId') ?? '') });
      const scene = await service.scene();
      if (op === 'scene') return send(200, { data: scene });
      if (op === 'dynamics') {
        const [courses, questions, learning] = await Promise.allSettled([service.courseProgress?.(), service.questionAggregation?.(), service.learningSummary?.()]);
        return send(200, { data: projectDynamics(scene, { courseProgress: courses.status === 'fulfilled' ? courses.value : undefined, questionAggregation: questions.status === 'fulfilled' ? questions.value : undefined, learningSummary: learning.status === 'fulfilled' ? learning.value : undefined }) });
      }
      if (op === 'catalog') {
        let chat; try { chat = service.capturedIm ? await service.capturedIm() : undefined; } catch { /* Capture-only capability stays hidden. */ }
        return send(200, { data: projectCatalog(scene, { im: Boolean(chat?.messages.length), chat }) });
      }
      const use = url.searchParams.get('use') ?? 'private-assistance';
      if (use !== 'private-assistance' && use !== 'message-draft') throw new ClassInError('forbidden', '未知数据使用范围。');
      const focus = url.searchParams.getAll('focus');
      const studentRef = (id: string) => `classin-test:student:${id}`;
      const messageFocus = focus.filter((ref) => ref.startsWith('classin-test:message:'));
      let capturedChatRead: ImChatReadResult | undefined;
      if (messageFocus.length || url.searchParams.get('referenceId')) capturedChatRead = service.capturedIm ? await service.capturedIm() : undefined;
      if (focus.length > 4 || messageFocus.length > 1 || focus.some((ref) => !scene.activities.some((a) => activityRef(a) === ref) && !scene.members.some((member) => member.identity === 1 && studentRef(member.id) === ref) && !capturedChatRead?.messages.some((message) => `classin-test:message:${message.id}` === ref))) throw new ClassInError('forbidden', '请求的业务对象超出授权范围或数量上限。');
      const query = (url.searchParams.get('query') ?? '').slice(0, 1000);
      const route = routeQuestion(query, scene.members.filter(({ identity }) => identity === 1).map(({ name }) => name));
      const lesson = ordinalFrom(query, '讲');
      const activityFocus = focus.filter((ref) => ref.startsWith('classin-test:activity:'));
      const selected = scene.activities.filter((a) => activityFocus.length ? activityFocus.includes(activityRef(a)) : query.includes(a.name) || (lesson && scene.units.find((u) => u.id === a.unitId)?.name.includes(`第${lesson}讲`)));
      const filtered = selected.filter((a) => !/作业|测验|录播|资料|课堂/.test(query) || activityFocus.length ||
        (a.kind === 'homework' && query.includes('作业')) || (a.kind === 'exam' && query.includes('测验')) || (a.kind === 'recording' && query.includes('录播')) || (a.kind === 'material' && query.includes('资料')) || (a.kind === 'classroom' && query.includes('课堂')));
      if (filtered.length > 4) throw new ClassInError('unsupported', '匹配到多项活动，请指定课堂、作业、测验或资料后查询。');
      let details = await Promise.all(filtered.map((a) => service.detail(a.id)));
      if (details.some((d) => JSON.stringify(d.activity) !== JSON.stringify(scene.activities.find((a) => a.id === d.activity.id)))) throw new ClassInError('incomplete', '读取期间活动发生变化，请刷新后再次查询。');
      const courseProgress = route?.questionId === 'A1' && service.courseProgress ? await service.courseProgress() : undefined;
      const historicalAttendance = route?.questionId === 'B2' && service.historicalAttendance ? await service.historicalAttendance() : undefined;
      const questionAggregation = route?.questionId === 'C5' && service.questionAggregation ? await service.questionAggregation() : undefined;
      const learningSummary = route && ['D1', 'D2', 'D5', 'E4'].includes(route.questionId) && service.learningSummary ? await service.learningSummary() : undefined;
      const explicitStudent = scene.members.filter((member) => member.identity === 1).filter((member) => focus.includes(studentRef(member.id)) || query.includes(member.name));
      if (route && ['D1', 'D2', 'D5'].includes(route.questionId) && explicitStudent.length !== 1) throw new ClassInError('unsupported', explicitStudent.length ? '匹配到多名学生，请明确选择一位学生。' : '请明确选择一位当前班级学生后查询。');
      const lessonReview = route?.questionId === 'E2' && details.length === 1 && service.lessonReview ? await service.lessonReview(details[0]!.activity.id) : undefined;
      let chatContext; let referencedQuestion;
      if (route && ['F1', 'F2', 'F3'].includes(route.questionId)) {
        if (!service.capturedIm) throw new ClassInError('unsupported', '真实消息快照读取尚未接通。');
        const read = capturedChatRead ?? await service.capturedIm();
        const referenceId = url.searchParams.get('referenceId') ?? messageFocus[0]?.slice('classin-test:message:'.length);
        if (route.questionId !== 'F1' && (!referenceId || !read.messages.some((message) => message.id === referenceId))) throw new ClassInError('unsupported', '请先引用一条当前班群消息。');
        chatContext = selectImChatContext(read, route.questionId === 'F1' ? '最近5天' : query, referenceId ?? undefined);
        if (route.questionId === 'F2') {
          const reference = read.messages.find((message) => message.id === referenceId)!; const lessonNumber = ordinalFrom(reference.body, '讲') ?? ordinalFrom(query, '讲');
          const position = Number(ordinalFrom(reference.body, '题') ?? ordinalFrom(query, '题'));
          const candidates = scene.activities.filter((activity) => activity.kind === 'homework' && activity.published && !activity.cancelled && (!lessonNumber || scene.units.find((unit) => unit.id === activity.unitId)?.name.includes(`第${lessonNumber}讲`)));
          if (candidates.length !== 1 || !Number.isSafeInteger(position)) throw new ClassInError('unsupported', '引用消息无法唯一定位作业版本和题号。');
          if (!service.homeworkQuestion) throw new ClassInError('unsupported', '图片题面读取尚未接通。');
          referencedQuestion = await service.homeworkQuestion(candidates[0]!.id, position);
          if (!details.some((detail) => detail.activity.id === candidates[0]!.id)) details = [...details, await service.detail(candidates[0]!.id)];
        }
      }
      const snapshot = projectContext(scene, use, details, query, { courseProgress, historicalAttendance, questionAggregation, learningSummary, targetStudentId: explicitStudent[0]?.id, referencedQuestion, lessonReview, chatContext, route });
      if (JSON.stringify(snapshot).length > 26_000) throw new ClassInError('unsupported', '本次内容较多，请指定一个活动或具体题号后查询。');
      return send(200, { data: snapshot });
    } catch (error) {
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      const failure = error instanceof ClassInError ? error : new ClassInError('upstream_error', '读取暂未完成，请重试。');
      send(failure.code === 'forbidden' ? 403 : failure.code === 'unauthorized' ? 401 : failure.code === 'unsupported' ? 422 : 503, { error: { code: failure.code, message: failure.message } });
    }
  };
}
