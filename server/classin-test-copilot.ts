import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ClassInActivity, ClassInCourseProgress, ClassInScene } from '../src/contracts/classin-test/index.ts';
import type { ImChatReadResult } from '../src/contracts/workbuddy/im-chat-context.ts';
import { ClassInError, object, TEST_SCOPE, type ClassInTransport } from './classin-test-transport.ts';

const rows = (value: unknown) => {
  if (!Array.isArray(value)) throw new ClassInError('schema_error', '接口列表结构发生变化。');
  return value as Record<string, unknown>[];
};
const text = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const id = (value: unknown) => String(value ?? '');

export type ClassInLessonReview = Readonly<{
  activityId: string;
  transcript: Readonly<{ status: 'available' | 'partial' | 'unavailable'; fileCount: number; usableFileCount: number; segmentCount: number; text: string; limitation: string }>;
  aiAnalysis: Readonly<{ status: 'available' | 'not_generated' | 'unavailable'; text: string; limitation: string }>;
  capturedAt: string;
  version: string;
}>;

function activity(value: Record<string, unknown>): ClassInActivity {
  const kinds = ['classroom', 'homework', 'exam', 'recording', 'material'] as const;
  const kind = kinds[Number(value.type) - 1];
  if (!kind || !/^\d+$/.test(id(value.activityId)) || !/^\d+$/.test(id(value.unitId))) throw new ClassInError('schema_error', '课程活动结构发生变化。');
  const fromSeconds = (input: unknown) => Number(input) > 0 ? new Date(Number(input) * 1000).toISOString() : null;
  const status = value.status && typeof value.status === 'object' && !Array.isArray(value.status) ? value.status as Record<string, unknown> : {};
  return { id: id(value.activityId), bizId: id(value.bizId), unitId: id(value.unitId), categoryId: id(value.categoryId), name: text(value.name) || '未命名活动', kind,
    startsAt: fromSeconds(value.startTime), endsAt: fromSeconds(value.endTime), published: value.publishFlag === 2, cancelled: value.classStatus === 4,
    process: Number(value.processFlag) || 0, summary: Object.fromEntries(['studentTotal', 'submitTotal', 'correctTotal', 'onClassTotal'].flatMap((key) => Number.isFinite(Number(status[key])) ? [[key, Number(status[key])]] : [])) };
}

export async function readCourseProgress(transport: ClassInTransport, scene: ClassInScene, now = new Date()): Promise<ClassInCourseProgress> {
  const categories = rows(object(await transport('/lms/app/category/list', { courseId: TEST_SCOPE.classId })).list);
  if (categories.length > 50 || new Set(categories.map((item) => id(item.categoryId))).size !== categories.length) throw new ClassInError('incomplete', '班级课程目录重复或超出读取边界。');
  const courses = [];
  for (const category of categories) {
    const categoryId = id(category.categoryId);
    if (!/^\d+$/.test(categoryId)) throw new ClassInError('schema_error', '课程标识缺失。');
    const units = rows(object(await transport('/lms/app/course/unitList', { courseId: TEST_SCOPE.classId, categoryId, sort: 'asc' })).list);
    if (units.length > 100 || units.some((unit) => id(unit.categoryId) !== categoryId)) throw new ClassInError('incomplete', '课程单元归属或数量无法核实。');
    let activities: ClassInActivity[] = [];
    if (units.length) {
      const groups = rows(object(await transport('/lms/app/course/unitActivityList', { courseId: TEST_SCOPE.classId, categoryId, SID: TEST_SCOPE.schoolId, unitIds: JSON.stringify(units.map((unit) => Number(unit.unitId))), offset: 0, limit: 100, sort: 'asc' })).list);
      if (groups.some((group) => Number(group.pageTotal) > 1 || !Array.isArray(group.activities))) throw new ClassInError('incomplete', '课程活动存在未读取分页。');
      activities = groups.flatMap((group) => rows(group.activities).map(activity));
      if (new Set(activities.map((item) => item.id)).size !== activities.length) throw new ClassInError('incomplete', '课程活动出现重复。');
    }
    const classrooms = activities.filter((item) => item.kind === 'classroom' && item.published && !item.cancelled).sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
    const ended = classrooms.filter((item) => item.endsAt && Date.parse(item.endsAt) <= now.valueOf());
    const upcoming = classrooms.filter((item) => item.startsAt && Date.parse(item.startsAt) > now.valueOf());
    courses.push({ id: categoryId, name: text(category.name ?? category.categoryName) || '未命名课程', unitCount: units.length, activityCount: activities.length,
      classCount: classrooms.length, completedClassCount: ended.length, lastCompleted: ended.at(-1) ?? null, nextClass: upcoming[0] ?? null });
  }
  const contents = { className: scene.class.name, courses };
  return { ...contents, capturedAt: now.toISOString(), version: createHash('sha256').update(JSON.stringify(contents)).digest('hex').slice(0, 16) };
}

function transcriptSegments(content: unknown): readonly Readonly<{ text: string; start: string; end: string }>[] {
  if (!content || typeof content !== 'object' || !Array.isArray((content as { children?: unknown }).children)) throw new ClassInError('schema_error', '课堂转写正文结构发生变化。');
  const result: { text: string; start: string; end: string }[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 12 || !node || typeof node !== 'object') throw new ClassInError('schema_error', '课堂转写层级发生变化。');
    const item = node as { desc?: unknown; metadata?: { times?: unknown }; children?: unknown };
    if (typeof item.desc === 'string' && item.desc.trim()) {
      const times = item.metadata?.times;
      if (!Array.isArray(times) || times.length !== 2 || times.some((time) => typeof time !== 'string' || !/^\d{2,}:\d{2}:\d{2}$/.test(time))) throw new ClassInError('schema_error', '课堂转写时间结构发生变化。');
      result.push({ text: item.desc.trim(), start: times[0] as string, end: times[1] as string });
    }
    if (item.children !== undefined) {
      if (!Array.isArray(item.children)) throw new ClassInError('schema_error', '课堂转写子条目结构发生变化。');
      item.children.forEach((child) => visit(child, depth + 1));
    }
  };
  (content as { children: unknown[] }).children.forEach((child) => visit(child, 0));
  return result;
}

function aiText(value: unknown): string {
  const data = object(value);
  const raw = typeof data.reportContent === 'string' ? data.reportContent : JSON.stringify(data);
  let parsed: unknown;
  try {
    const outer = JSON.parse(raw); const markdown = typeof outer?.rawMarkdown === 'string' ? outer.rawMarkdown : raw;
    const match = markdown.match(/```json\s*([\s\S]*?)\s*```/); parsed = JSON.parse(match?.[1] ?? markdown);
  } catch { return text(raw).slice(0, 3000); }
  const strings: string[] = [];
  const visit = (item: unknown, key = '', depth = 0) => {
    if (depth > 7 || strings.join('').length > 4500) return;
    if (typeof item === 'string' && item.trim() && !['dialogue', 'student_progress'].includes(key)) strings.push(item.trim());
    else if (Array.isArray(item)) item.forEach((entry) => visit(entry, key, depth + 1));
    else if (item && typeof item === 'object') Object.entries(item).forEach(([nextKey, entry]) => {
      if (!['dialogue', 'student_progress', 'score_reason'].includes(nextKey)) visit(entry, nextKey, depth + 1);
    });
  };
  visit(parsed);
  return [...new Set(strings)].join('；').slice(0, 4500);
}

export async function readLessonReview(transport: ClassInTransport, scene: ClassInScene, selected: ClassInActivity): Promise<ClassInLessonReview> {
  if (selected.kind !== 'classroom' || !selected.published || selected.cancelled) throw new ClassInError('forbidden', '课堂回顾只能读取当前授权课程的已发布课堂。');
  const replay = object(await transport('/api/classin.api.php?action=getLessonRecordInfo', { SID: TEST_SCOPE.schoolId, clientCourseId: TEST_SCOPE.classId, clientClassId: selected.bizId, memberUid: TEST_SCOPE.uid }));
  if (id(replay.lessonId) !== selected.bizId) throw new ClassInError('forbidden', '课堂回放课节归属不一致。');
  const lessonData = replay.lessonData;
  const files = Array.isArray(lessonData) && lessonData.length === 0 ? [] : rows(object(lessonData).fileList);
  if (files.length > 10 || files.some((file) => !/^\d+$/.test(id(file.FileId))) || new Set(files.map((file) => id(file.FileId))).size !== files.length) throw new ClassInError('incomplete', '课堂回放文件未知、重复或超出边界。');
  const transcripts: { status: string; segments: readonly Readonly<{ text: string; start: string; end: string }>[] }[] = [];
  for (const file of files) {
    try {
      const response = object(await transport('/course-ai-assistant/app/file/richVideoSummary', { bizType: 1, subtitle: 1, classId: Number(selected.bizId), courseId: Number(TEST_SCOPE.classId), fileId: id(file.FileId), isRetry: false, schoolId: Number(TEST_SCOPE.schoolId) }, false));
      transcripts.push({ status: response.content == null ? 'unavailable' : 'available', segments: response.content == null ? [] : transcriptSegments(response.content) });
    } catch { transcripts.push({ status: 'failed', segments: [] }); }
  }
  const available = transcripts.filter((item) => item.status === 'available' && item.segments.length);
  const joined = available.flatMap((item, fileIndex) => item.segments.map((segment) => `[文件${fileIndex + 1} ${segment.start}-${segment.end}] ${segment.text}`)).join('\n');
  const transcriptText = [...joined].slice(0, 3200).join('');
  let analysisStatus: 'available' | 'not_generated' | 'unavailable'; let analysisText = '';
  try {
    const check = object(await transport('/course-ai-assistant/app/course/checkAiTeachingAnalysisRecord', { courseId: Number(TEST_SCOPE.classId), classId: Number(selected.bizId) }, false));
    if (check.hasRecord === false) analysisStatus = 'not_generated';
    else if (check.hasRecord === true) {
      const located = object(await transport('/course-ai-assistant/app/file/aiTeachingAnalysis', { courseId: Number(TEST_SCOPE.classId), classId: Number(selected.bizId), theme: 'light', language: 'zh-CN', fileIds: [] }, false));
      const records = rows(located.list); if (records.length !== 1) throw new ClassInError('incomplete', 'AI授课分析记录无法唯一定位。');
      const record = records[0]!; const report = new URL(String(record.reportUrl), 'https://dynamic14.eeo.im').searchParams.get('report');
      if (!report) throw new ClassInError('schema_error', 'AI授课分析票据缺失。');
      analysisText = aiText(await transport('/course-ai-assistant/admin/ai-teaching-analysis/report', { classId: Number(selected.bizId), report, reqFileId: record.requestFileId ?? '' }, false)).slice(0, 1400);
      analysisStatus = analysisText ? 'available' : 'unavailable';
    } else throw new ClassInError('schema_error', 'AI授课分析状态发生变化。');
  } catch { analysisStatus = 'unavailable'; }
  const contents = { activityId: selected.id, transcript: { status: available.length === files.length && files.length ? 'available' as const : available.length ? 'partial' as const : 'unavailable' as const,
    fileCount: files.length, usableFileCount: available.length, segmentCount: available.reduce((count, item) => count + item.segments.length, 0), text: transcriptText,
    limitation: `${joined.length > transcriptText.length ? '输入容量只载入部分原始转写；' : ''}机器转写可能误识别，多个视频按文件分开，不能用来推断学生掌握。` },
    aiAnalysis: { status: analysisStatus, text: analysisText, limitation: 'AI授课分析是生成内容，只作课堂回顾辅助，不替代转写、出勤或学习结果。' } };
  return { ...contents, capturedAt: new Date().toISOString(), version: createHash('sha256').update(JSON.stringify(contents)).digest('hex').slice(0, 16) };
}

export async function readCapturedIm(scene: ClassInScene, root = join(process.cwd(), '.runtime', 'private', 'copilot-api-review-lab', 'im-original', 'latest.json')): Promise<ImChatReadResult> {
  let source: unknown;
  try { source = JSON.parse(await readFile(root, 'utf8')); } catch { throw new ClassInError('unsupported', '尚未找到当前班群的真实消息原文快照。'); }
  const data = object(source); const scope = object(data.scope);
  if (data.version !== 'private-im-original-v1' || id(scope.uid) !== TEST_SCOPE.uid || id(scope.courseId) !== TEST_SCOPE.classId || !Array.isArray(data.frames)) throw new ClassInError('forbidden', '消息原文快照归属不符合当前授权班群。');
  const memberNames = new Map(scene.members.map((member) => [member.id, member.name]));
  const frames = rows(data.frames); if (frames.length > 200) throw new ClassInError('incomplete', '消息分页帧超过当前安全边界。');
  const messages = frames.flatMap((frame) => {
    if (!['requestChatMsg', 'receiveChatMsg'].includes(String(frame.type))) throw new ClassInError('schema_error', '消息快照出现未验证帧类型。');
    return rows(frame.messages);
  }).filter((message) => id(object(message.clusterId).id) === TEST_SCOPE.classId).map((message) => {
    const uid = id(message.talkerUid); const seconds = Number(message.time); const sentAt = Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : '';
    const body = typeof message.content === 'string' ? message.content : '';
    const agent = uid === '0' || (typeof message.agentId === 'string' && message.agentId.length > 0);
    return { id: id(message.msgId), sentAt, authorRole: agent ? 'class-agent' as const : uid === TEST_SCOPE.uid ? 'teacher' as const : 'student-family' as const,
      authorName: agent ? (typeof message.agentName === 'string' && message.agentName.trim() ? message.agentName.trim() : 'ClassIn Agent') : uid === TEST_SCOPE.uid ? scene.teacher.name : memberNames.get(uid) ?? `成员 ${uid}`,
      body, ...(Number(message.quoteMsgId) > 0 ? { replyToId: id(message.quoteMsgId) } : {}),
      ...(message.isDeleted === true || message.isUndone === true ? { retracted: true } : {}), ...(Number(message.type) !== 0 ? { hasUnreadMedia: true } : {}) };
  }).filter((message) => message.id && message.sentAt && (message.body.trim() || message.retracted)).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const uniqueMap = new Map<string, typeof messages[number]>();
  for (const message of messages) { const previous = uniqueMap.get(message.id); if (previous && JSON.stringify(previous) !== JSON.stringify(message)) throw new ClassInError('incomplete', '消息分页出现同ID不同内容，需重新同步。'); uniqueMap.set(message.id, message); }
  const unique = [...uniqueMap.values()];
  const capturedAt = typeof data.capturedAt === 'string' ? data.capturedAt : unique.at(-1)?.sentAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(capturedAt)) || unique.some((message) => Date.parse(message.sentAt) > Date.parse(capturedAt))) throw new ClassInError('schema_error', '消息快照时间范围不一致。');
  const coverage = object(data.coverage);
  return { threadRef: `classin-test:class:${scene.class.id}:course:${scene.course.id}`, capturedAt, messages: unique, complete: coverage.complete === true };
}
