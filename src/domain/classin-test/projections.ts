import type { ClassInActivity, ClassInActivityDetail, ClassInCourseProgress, ClassInHistoricalAttendance, ClassInLearningSummary, ClassInQuestionAggregation, ClassInResolvedHomeworkQuestion, ClassInScene } from '../../contracts/classin-test/index.ts';
import type { BusinessContextItem, BusinessContextSnapshot, BusinessContextUse, LearningContextCatalog } from '../../contracts/workbuddy/business-context.ts';
import type { TeachingDynamicItem, TeachingDynamicsSnapshot, TeachingStageId } from '../../contracts/workbuddy/teaching-dynamics.ts';
import { GENERAL_QUESTION_TEXT } from '../workbuddy/general-question-guidance.js';
import type { ClassInCopilotQuestionId, ClassInCopilotToolId, ClassInToolRouteReceipt } from '../../contracts/classin-test/copilot-context.ts';
import type { ImChatContext, ImChatReadResult } from '../../contracts/workbuddy/im-chat-context.ts';
export const kindLabels = { classroom: '在线课堂', homework: '作业', exam: '测验', recording: '录播课', material: '学习资料' };
export const threadRef = (scene: ClassInScene) => `classin-test:class:${scene.class.id}:course:${scene.course.id}`;
export const activityRef = (a: ClassInActivity) => `classin-test:activity:${a.id}`;
export const dateLabel = (date: string | null, includeSeconds = false) => date ? new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: includeSeconds ? '2-digit' : undefined, hour12: false }) : '未设置';
const calendarLabel = (date: string | null, includeSeconds = false) => date ? `${dateLabel(date, includeSeconds)}（${new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'long' }).format(new Date(date))}）` : '未设置';
export function projectDynamics(scene: ClassInScene, supplement: Readonly<{ courseProgress?: ClassInCourseProgress; questionAggregation?: ClassInQuestionAggregation; learningSummary?: ClassInLearningSummary }> = {}): TeachingDynamicsSnapshot {
  const now = Date.parse(scene.capturedAt); const items: TeachingDynamicItem[] = [];
  let hasCurrentClassroom = false;
  const published = scene.activities.filter((a) => a.published && !a.cancelled);
  if (supplement.courseProgress?.courses.length) {
    const progress = supplement.courseProgress; const ended = progress.courses.reduce((count, course) => count + course.completedClassCount, 0);
    items.push({ id: `course-progress:${progress.version}`, contextLabel: `${scene.class.name} · 课程计划`, courseRef: scene.course.id, recommendationKey: 'P01', stage: 'before', kind: 'progress', title: '同步课程计划',
      detail: `${progress.courses.length}门课程分别核对；已结束课堂合计${ended}节，回答时按课程分列，不生成混合百分比。`, priority: 90,
      action: { label: '整理课程计划', teacherRequest: '我们班有哪些课程，分别学到哪了？请列出单元数、已结束课堂、最近课堂和下一课堂，不生成混合百分比。', contextRefs: [] } });
  }
  for (const a of published) {
    const start = a.startsAt ? Date.parse(a.startsAt) : NaN; const end = a.endsAt ? Date.parse(a.endsAt) : NaN;
    const base = { id: activityRef(a), contextLabel: `${scene.course.name} · ${kindLabels[a.kind]}`, courseRef: scene.course.id, objectRef: activityRef(a) };
    if (a.kind === 'classroom' && a.process !== 2 && (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)) {
      items.push({ ...base, stage: 'during', kind: 'unknown', title: a.name, detail: '课堂时间信息不完整，暂时无法确认是否正在上课。', priority: 70 });
    } else if (a.kind === 'classroom' && start > now && start - now <= 24 * 3600_000 && a.process !== 2) {
      items.push({ ...base, recommendationKey: 'P02', stage: 'before', kind: 'attention', title: a.name, detail: `${dateLabel(a.startsAt)} 开始；应参加人数以活动分配为准。`, priority: 100,
        action: { label: '整理课前提醒', teacherRequest: `请为“${a.name}”生成课前提醒草稿，使用真实开课日期和时间，不编造入课链接。`, contextRefs: [activityRef(a)] } });
    } else if (a.kind === 'classroom' && start <= now && end > now && a.process !== 2) {
      hasCurrentClassroom = true;
      items.push({ ...base, stage: 'during', kind: 'unknown', title: a.name, detail: '处于排定上课时间，实时到课情况暂未确认。', priority: 70 });
    } else if (['homework', 'exam'].includes(a.kind) && start <= now && end > now && a.process !== 2) {
      items.push({ ...base, recommendationKey: a.kind === 'homework' ? 'P05' : 'P06', stage: 'after', kind: 'teacher-task', title: a.name, detail: `${dateLabel(a.endsAt)} 截止；${a.summary.submitTotal === undefined ? '提交统计未知' : `已提交 ${a.summary.submitTotal} 人`}。`, priority: 60,
        action: { label: '整理任务提醒', teacherRequest: `请为“${a.name}”整理提醒草稿，注明截止日期，根据实际任务状态表达，不公开个人成绩。`, contextRefs: [activityRef(a)] } });
    }
  }
  if (!items.some((i) => i.stage === 'before')) {
    const next = published.filter((a) => a.kind === 'classroom' && a.process !== 2 && a.startsAt && Date.parse(a.startsAt) > now).sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))[0];
    items.push({ id: 'no-imminent-class', stage: 'before', kind: 'confirmation', title: '24 小时内暂无即将开始的课堂', detail: next ? `下一课：${next.name}，${dateLabel(next.startsAt)}。` : '当前课程没有后续排定课堂。', priority: 0 });
  }
  const latestEndedClassroom = published.filter((activity) => activity.kind === 'classroom' && activity.process === 2 && activity.endsAt && Date.parse(activity.endsAt) <= now)
    .sort((left, right) => (right.endsAt ?? '').localeCompare(left.endsAt ?? ''))[0];
  if (latestEndedClassroom) {
    const companions = published.filter((activity) => activity.unitId === latestEndedClassroom.unitId && ['homework', 'exam'].includes(activity.kind));
    if (companions.length) items.push({ id: `lesson-companions:${latestEndedClassroom.id}:${scene.version}`, contextLabel: `${scene.course.name} · ${latestEndedClassroom.name}`, courseRef: scene.course.id, objectRef: activityRef(latestEndedClassroom), recommendationKey: 'P04', stage: 'after', kind: 'attention', title: '同步本讲任务',
      detail: `同一课程结构下已发布${companions.length}项作业/测验：${companions.map(({ name }) => name).join('、')}。`, priority: 80,
      action: { label: '整理本讲任务', teacherRequest: `请整理《${latestEndedClassroom.name}》同一讲次下已发布的配套作业和测验，写清类型与截止时间。`, contextRefs: [activityRef(latestEndedClassroom), ...companions.slice(0, 3).map(activityRef)] } });
    items.push({ id: `lesson-recap:${latestEndedClassroom.id}:${scene.version}`, contextLabel: `${scene.course.name} · ${latestEndedClassroom.name}`, courseRef: scene.course.id, objectRef: activityRef(latestEndedClassroom), recommendationKey: 'P08', stage: 'summary', kind: 'progress', title: '生成本讲课堂回顾',
      detail: '点击后读取该课堂的原始转写、笔记和 AI 分析；只有实际可读来源进入回顾。', priority: 70,
      action: { label: '整理课堂回顾', teacherRequest: `把《${latestEndedClassroom.name}》实际讲授的内容整理成课堂回顾，区分原始转写、教师笔记和AI分析来源。`, contextRefs: [activityRef(latestEndedClassroom)] } });
  }
  const highFrequency = supplement.questionAggregation?.questions.filter((question) => question.validCount > 0 && question.wrongCount + question.partialCount > 0)
    .sort((left, right) => ((right.wrongCount + right.partialCount) / right.validCount) - ((left.wrongCount + left.partialCount) / left.validCount) || (right.wrongCount + right.partialCount) - (left.wrongCount + left.partialCount))[0];
  if (highFrequency) items.push({ id: `question-aggregation:${supplement.questionAggregation!.version}`, contextLabel: `${scene.course.name} · 逐题统计`, courseRef: scene.course.id,
    recommendationKey: 'P07', stage: 'after', kind: 'teacher-task', title: '整理高频错题材料',
    detail: `《${highFrequency.activityName}》第${highFrequency.position}题：有效判定${highFrequency.validCount}人，未完全正确${highFrequency.wrongCount + highFrequency.partialCount}人。`, priority: 50,
    action: { label: '整理错题材料', teacherRequest: '请根据最近已完成测验的真实逐题判定整理高频错题材料，注明有效分母，不推断学生错因。', contextRefs: [] } });
  if (supplement.learningSummary) {
    const learning = supplement.learningSummary;
    items.push({ id: `weekly-learning:${learning.version}`, contextLabel: `${scene.course.name} · 受限活动聚合`, courseRef: scene.course.id, recommendationKey: 'P09', stage: 'summary', kind: 'progress',
      title: '生成整班阶段总结', detail: `${learning.period.label}；覆盖${learning.coverage.studentCount}名学生、${learning.coverage.activityCount}项活动，未来课堂${learning.futureSchedule.length}节另列。`, priority: 40,
      action: { label: '整理班级周报', teacherRequest: '请总结我们班本周的学习情况，明确这是受限活动聚合，写清学生和活动覆盖，未来安排单列。', contextRefs: [] } });
    const candidate = learning.students.find((student) => student.records.some((record) => ['incomplete', 'overdue'].includes(record.state)));
    if (candidate) items.push({ id: `student-learning:${learning.version}:${candidate.id}`, contextLabel: `${scene.course.name} · 受限活动聚合`, courseRef: scene.course.id, recommendationKey: 'P10', stage: 'summary', kind: 'teacher-task',
      title: `整理${candidate.name}的学情`, detail: `基于当前自然周已核验活动，只陈述到课和任务状态，不推断错因或进步。`, priority: 30,
      action: { label: '整理个人学情', teacherRequest: `请总结${candidate.name}本周的学习情况，注明覆盖范围，不评价进步或推断错因。`, contextRefs: [`classin-test:student:${candidate.id}`] } });
  }
  const stages: TeachingStageId[] = ['before', 'during', 'after', 'summary'];
  return { threadRef: threadRef(scene), currentStage: hasCurrentClassroom ? 'during' : items.some((i) => i.stage === 'before' && i.action) ? 'before' : 'after',
    stages: stages.map((stage) => ({ id: stage, items: items.filter((i) => i.stage === stage).sort((a, b) => b.priority - a.priority) })),
    capturedAt: scene.capturedAt, version: scene.version, sourceRefs: [threadRef(scene)], truthLabel: 'read-only-business-data' };
}
export function projectCatalog(scene: ClassInScene, availability: Readonly<{ im: boolean; chat?: ImChatReadResult }> = { im: false }): LearningContextCatalog {
  // Individual results require a separate, verified direct-message scope.
  const now = Date.parse(scene.capturedAt);
  const activeHomework = scene.activities.filter((activity) => activity.kind === 'homework' && activity.published && !activity.cancelled && activity.endsAt && Date.parse(activity.endsAt) > now).sort((left, right) => (left.endsAt ?? '').localeCompare(right.endsAt ?? ''))[0];
  const latestClassroom = scene.activities.filter((activity) => activity.kind === 'classroom' && activity.published && !activity.cancelled && activity.endsAt && Date.parse(activity.endsAt) <= now).sort((left, right) => (right.endsAt ?? '').localeCompare(left.endsAt ?? ''))[0];
  const latestEndedClassrooms = scene.activities.filter((activity) => activity.kind === 'classroom' && activity.published && !activity.cancelled && activity.process === 2 && activity.endsAt && Date.parse(activity.endsAt) <= now).sort((left, right) => (right.endsAt ?? '').localeCompare(left.endsAt ?? '')).slice(0, 5);
  const activeRecording = scene.activities.filter((activity) => activity.kind === 'recording' && activity.published && !activity.cancelled && activity.startsAt && Date.parse(activity.startsAt) <= now && (!activity.endsAt || Date.parse(activity.endsAt) > now)).sort((left, right) => (left.startsAt ?? '').localeCompare(right.startsAt ?? ''))[0];
  const completedExam = scene.activities.filter((activity) => activity.kind === 'exam' && activity.published && !activity.cancelled && activity.process === 2 && (activity.summary.topicAmount ?? 0) > 0 && activity.endsAt && Date.parse(activity.endsAt) <= now).sort((left, right) => (right.endsAt ?? '').localeCompare(left.endsAt ?? ''))[0];
  const material = scene.activities.filter((activity) => activity.kind === 'material' && activity.published && !activity.cancelled).sort((left, right) => (right.startsAt ?? '').localeCompare(left.startsAt ?? ''))[0];
  const students = scene.members.filter((member) => member.identity === 1);
  const reviewStudent = students[0];
  const homeworkQuestionMessage = availability.chat?.messages.find((message) => message.authorRole === 'student-family' && /作业.*第二题|第二题.*作业/.test(message.body));
  const replyQuestionMessage = availability.chat?.messages.find((message) => message.authorRole === 'student-family' && /圆周率.*有理数|有理数.*圆周率/.test(message.body));
  const questions = [
    { id: 'A1' as const, text: GENERAL_QUESTION_TEXT.A1, contextRefs: [] },
    { id: 'A2' as const, text: GENERAL_QUESTION_TEXT.A2, contextRefs: [] },
    { id: 'A3' as const, text: GENERAL_QUESTION_TEXT.A3, contextRefs: [] },
    ...(latestClassroom ? [
      { id: 'A4' as const, text: `《${latestClassroom.name}》有哪些配套活动和资料？`, contextRefs: [activityRef(latestClassroom)] },
      { id: 'B1' as const, text: `《${latestClassroom.name}》的到课情况怎么样？`, contextRefs: [activityRef(latestClassroom)] },
    ] : []),
    ...(latestEndedClassrooms.length ? [{ id: 'B2' as const, text: '最近几节课，哪些同学有迟到或缺席记录？', contextRefs: [] }] : []),
    ...(activeRecording ? [{ id: 'B3' as const, text: `《${activeRecording.name}》大家学到哪了？`, contextRefs: [activityRef(activeRecording)] }] : []),
    ...(activeHomework ? [
      { id: 'C1' as const, text: `《${activeHomework.name}》要做什么，什么时候截止？`, contextRefs: [activityRef(activeHomework)] },
      { id: 'C2' as const, text: `《${activeHomework.name}》还有谁没交，交上来的批完了吗？`, contextRefs: [activityRef(activeHomework)] },
    ] : []),
    ...(completedExam ? [{ id: 'C5' as const, text: '最近完成的作业和测验里，哪些题错得多？', contextRefs: [] }] : []),
    ...(reviewStudent ? [
      { id: 'D1' as const, text: `了解${reviewStudent.name}本周的学习情况`, contextRefs: [`classin-test:student:${reviewStudent.id}`] },
      { id: 'D2' as const, text: `${reviewStudent.name}还有哪些学习任务没完成？`, contextRefs: [`classin-test:student:${reviewStudent.id}`] },
      { id: 'D5' as const, text: `根据${reviewStudent.name}本周已核验的学情事实，起草一段仅供老师审阅的家长沟通内容`, contextRefs: [`classin-test:student:${reviewStudent.id}`] },
    ] : []),
    ...(latestClassroom ? [
      { id: 'E1' as const, text: `《${latestClassroom.name}》有哪些报告、回放和板书？`, contextRefs: [activityRef(latestClassroom)] },
      { id: 'E2' as const, text: `把《${latestClassroom.name}》讲的内容整理成课堂回顾`, contextRefs: [activityRef(latestClassroom)] },
    ] : []),
    ...(material ? [{ id: 'E3' as const, text: `帮我把《${material.name}》里的方法整理成三点`, contextRefs: [activityRef(material)] }] : []),
    { id: 'E4' as const, text: '总结一下我们班本周的学习情况', contextRefs: [] },
    ...(availability.im ? [{ id: 'F1' as const, text: '总结群里最近5天实际读取到的聊天要点，有多少就总结多少', contextRefs: [] }] : []),
    ...(homeworkQuestionMessage ? [{ id: 'F2' as const, text: `讲解群里${homeworkQuestionMessage.authorName}提到的第一讲作业第二题，先还原完整题面并验算`, contextRefs: [`classin-test:message:${homeworkQuestionMessage.id}`] }] : []),
    ...(replyQuestionMessage ? [{ id: 'F3' as const, text: `根据群里后续回复，核对老师是否已经回答${replyQuestionMessage.authorName}“圆周率是不是有理数”的问题；如需草稿，只补充原回复没有覆盖的信息`, contextRefs: [`classin-test:message:${replyQuestionMessage.id}`] }] : []),
  ];
  return { students: students.map((student) => ({ ref: `classin-test:student:${student.id}`, label: student.name, description: '当前授权班级学生' })), lessons: scene.activities.filter((a) => a.kind === 'classroom').map((a) => ({ ref: activityRef(a), label: a.name, description: dateLabel(a.startsAt) })),
    assignments: scene.activities.filter((a) => a.kind === 'homework' || a.kind === 'exam').map((a) => ({ ref: activityRef(a), label: a.name, description: dateLabel(a.endsAt) })),
    wrongQuestions: [], periods: [{ ref: 'classin-test:period:current-week', label: '当前自然周', description: 'Asia/Shanghai 周一至读取时刻' }], reminderReasons: [], questionGuidance: { questions, initialQuestionIds: questions.slice(0, 3).map(({ id }) => id) }, version: scene.version, truthLabel: 'read-only-business-data' };
}
type CopilotSupplement = Readonly<{
  courseProgress?: Readonly<{ courses: readonly Readonly<{ name: string; unitCount: number; activityCount: number; classCount: number; completedClassCount: number; lastCompleted: ClassInActivity | null; nextClass: ClassInActivity | null }>[]; version: string }>;
  historicalAttendance?: ClassInHistoricalAttendance;
  questionAggregation?: ClassInQuestionAggregation;
  learningSummary?: ClassInLearningSummary;
  targetStudentId?: string;
  referencedQuestion?: ClassInResolvedHomeworkQuestion;
  lessonReview?: Readonly<{ transcript: Readonly<{ status: string; fileCount: number; usableFileCount: number; segmentCount: number; text: string; limitation: string }>; aiAnalysis: Readonly<{ status: string; text: string; limitation: string }>; version: string }>;
  chatContext?: ImChatContext;
  route?: Readonly<{ questionId: ClassInCopilotQuestionId; tools: readonly ClassInCopilotToolId[] }>;
}>;
export function projectContext(scene: ClassInScene, use: BusinessContextUse, details: readonly ClassInActivityDetail[] = [], query = '', supplement: CopilotSupplement = {}): BusinessContextSnapshot {
  const ref = threadRef(scene); const source = `classin-test:${scene.class.id}/${scene.course.id}`; const items: BusinessContextItem[] = [];
  const isLessonReview = supplement.route?.questionId === 'E2';
  const isImSummary = supplement.route?.questionId === 'F1';
  const isCourseProgress = supplement.route?.questionId === 'A1';
  const isAttendanceHistory = supplement.route?.questionId === 'B2';
  const isQuestionAggregation = supplement.route?.questionId === 'C5';
  const isLearningSummary = Boolean(supplement.route && ['D1', 'D2', 'D5', 'E4'].includes(supplement.route.questionId));
  const add = (key: string, name: string, text: string, objectRef = ref, sensitivity: BusinessContextItem['sensitivity'] = 'standard') => {
    // Chunk before the runtime Envelope's per-value limit; never silently truncate facts.
    const chars = [...text]; for (let offset = 0; offset < chars.length; offset += 200) items.push({ key: `${objectRef}:${key}-${offset}`, label: name, value: chars.slice(offset, offset + 200).join(''), sourceRef: source, sensitivity });
  };
  add('boundary', '数据范围', `ClassIn 测试环境；教师授权的班级“${scene.class.name}”、课程“${scene.course.name}”。这些是通过真实 API 读取的测试业务对象，部分教学内容为测试构造。普通 IM 未接通，不能称消息已发送；实时出勤未验证。当前时间 ${calendarLabel(scene.capturedAt)}，Asia/Shanghai。日期和星期由系统核算，提醒中的星期必须与同一日期的证据一致。`);
  if (!isLessonReview && !isImSummary && !isCourseProgress && !isAttendanceHistory && !isQuestionAggregation && !isLearningSummary) {
    add('roster', '班级成员构成与活动分配', `班级学生 ${scene.members.filter((m) => m.identity === 1).length} 人，旁听 ${scene.members.filter((m) => m.identity === 2).length} 人，教师 ${scene.members.filter((m) => m.identity === 3).length} 人，助教 ${scene.members.filter((m) => m.identity === 4).length} 人，其他身份 ${scene.members.filter((m) => ![1, 2, 3, 4].includes(m.identity)).length} 人。学生数只按 identity=1 统计；班级名单不等于每项活动分配或实际参与。`);
    add('inventory', '完整课程统计', Object.entries(kindLabels).map(([kind, name]) => `${name} ${scene.activities.filter((a) => a.kind === kind).length} 项`).join('；'));
    add('units', '完整单元目录', scene.units.filter((u) => u.count > 0).map((u) => `${u.name}（${u.count}项）`).join('；'));
  }
  if (supplement.courseProgress) for (const course of supplement.courseProgress.courses) {
    add(`course-progress-${course.name}`, `课程进度：${course.name}`, `接口返回单元总数${course.unitCount}个（单元数不是讲次数，禁止改写）；教学活动${course.activityCount}项；已发布未取消课堂${course.classCount}节，其中按当前业务时钟已结束${course.completedClassCount}节（只能写“已结束${course.completedClassCount}节”，不能推断为“已完成前N讲”）；最近已结束课堂：${course.lastCompleted ? `${course.lastCompleted.name}（${calendarLabel(course.lastCompleted.endsAt)}结束）` : '没有'}；下一课堂：${course.nextClass ? `${course.nextClass.name}（${calendarLabel(course.nextClass.startsAt)}开始）` : '没有后续排课'}。各课程分别统计，不混算学习百分比。`);
  }
  const now = Date.parse(scene.capturedAt);
  const focused = new Set(details.map((d) => d.activity.id));
  const visible = focused.size ? scene.activities.filter((a) => focused.has(a.id)) : [
    ...scene.activities.filter((a) => a.kind === 'classroom' && a.published && !a.cancelled && a.startsAt && Date.parse(a.startsAt) > now).sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? '')).slice(0, 3),
    ...scene.activities.filter((a) => ['homework', 'exam'].includes(a.kind) && a.published && a.startsAt && a.endsAt && Date.parse(a.startsAt) <= now && Date.parse(a.endsAt) > now).slice(0, 4),
  ];
  if (!isImSummary && !isCourseProgress && !isAttendanceHistory && !isQuestionAggregation && !isLearningSummary) add('read-window', '明细读取范围', focused.size ? '以下明细只覆盖本次明确定位的活动；全课程目录与统计已取全。' : '以下明细覆盖最近三堂后续课及至多四项进行中的作业/测验。全部活动时间表在页面可见，其他活动详情请指定讲次和类型。');
  for (const a of isImSummary || isCourseProgress || isAttendanceHistory || isQuestionAggregation || isLearningSummary ? [] : visible) {
    add(a.id, `${kindLabels[a.kind]}：${a.name}`, `开始 ${calendarLabel(a.startsAt)}；结束/截止 ${calendarLabel(a.endsAt)}；${a.cancelled ? '已取消/删除' : a.published ? '已显示发布' : '草稿或隐藏'}；分配 ${a.summary.studentTotal ?? '未知'} 人；${a.summary.submitTotal === undefined ? '' : `已提交 ${a.summary.submitTotal} 人；`} ${a.summary.correctTotal === undefined ? '' : `列表批阅统计 ${a.summary.correctTotal} 人（明细需核对）；`}对象 ${a.id}`, activityRef(a));
  }
  for (const d of details) {
    add(`detail-${d.activity.id}`, `${d.activity.name} 内容`, d.description || '此接口未提供可读取正文；不要补造题目。', activityRef(d.activity));
    if (d.replay && !isLessonReview) {
      add(`replay-${d.activity.id}`, '课堂专用回放', d.replay.message, activityRef(d.activity));
      add(`replay-boundary-${d.activity.id}`, '录制证据边界', '排课开始时间不等于实际开始讲授时间。本次回放元数据没有提供实际开讲时刻或教学内容时间轴；不能从教师笔记推断未录时段讲了哪些具体内容，须说明这些信息未知。', activityRef(d.activity));
      d.replay.files.forEach((file, i) => add(`replay-file-${d.activity.id}-${i}`, `回放文件${i + 1}元数据`, `接口状态码${file.statusCode}（完整枚举未验证，不据此推断播放权限）；录制开始${calendarLabel(file.startsAt, true)}；结束${calendarLabel(file.endsAt, true)}；文件时长${file.durationSeconds ?? '未提供'}秒；生成时间${calendarLabel(file.createdAt, true)}。此录制范围不等于整堂排课时间，不能声称全部课堂内容均已录入。`, activityRef(d.activity)));
    }
    if (!isLessonReview) for (const field of d.fields) add(`field-${d.activity.id}-${field.label}`, field.label, field.value, activityRef(d.activity));
    const groups = new Map<string, number>(); d.students.forEach((s) => groups.set(s.status, (groups.get(s.status) ?? 0) + 1));
    if (!isLessonReview) add(`progress-${d.activity.id}`, '活动分配与进度汇总', [...groups].map(([status, n]) => `${status} ${n} 人`).join('；'), activityRef(d.activity));
    if (use === 'private-assistance' && !isLessonReview) {
      for (const s of d.students) items.push({ key: `student-${d.activity.id}-${s.id}`, label: '教师私有学习结果', value: `${s.name}：${s.status}；成绩 ${s.grade ?? '未提供或不评分'}${s.progress === null ? '' : `；进度 ${s.progress}%`}${s.durationSeconds === null ? '' : `；学习时长 ${s.durationSeconds} 秒`}`, sourceRef: source, sensitivity: 'student-personal' });
      if (/答题|作答|提交内容|批阅|批改|评语|反馈/.test(query)) for (const s of d.students) {
        if (s.examAnswers) {
          const requested = query.match(/第\s*(\d+)\s*题/)?.[1];
          const records = requested ? s.examAnswers.questions.filter((q) => q.position === Number(requested)) : s.examAnswers.questions;
          add(`exam-answers-${d.activity.id}-${s.id}`, '教师私有测验作答', `${s.name}：${s.examAnswers.message} ${records.map((q) => `第${q.position}题：${q.status}；答案${q.answers.join('；') || (q.hasMedia ? '含媒体，内容未知' : '未取得可读答案')}；批阅${q.marking ?? '不适用或未提供'}；得分${q.score === null ? '未确认实际成绩' : `${q.score}分`}`).join('\n')}`, activityRef(d.activity), 'student-personal');
        }
        if (s.submission) add(`submission-${d.activity.id}-${s.id}`, '教师私有作业提交内容', `${s.name}：${s.submission.message} 正文：${s.submission.text || '未取得可读正文'}；教师评语：${s.submission.teacherFeedback || '未提供'}；附件：${s.submission.attachments.map((a) => `${a.kind} ${a.count}份`).join('、') || '未取得附件'}。没有原图内容时不能推断正确率或逐题表现。`, activityRef(d.activity), 'student-personal');
      }
    }
    if (use === 'private-assistance' && /题|答案|解析|解答/.test(query)) {
      const requestedQuestion = query.match(/第\s*(\d+)\s*题/)?.[1];
      const questions = requestedQuestion ? (d.questions ?? []).filter((_, i) => i + 1 === Number(requestedQuestion)) : d.questions ?? [];
      for (const q of questions) {
        add(`question-${q.id}`, `第${(d.questions ?? []).findIndex((item) => item.id === q.id) + 1}题（试题 ${q.id}）`, `${q.content}${q.hasImage ? '（包含图片，文字题干不完整）' : ''}；选项：${q.options.map((o, i) => `${i + 1}. ${o}`).join('；')}；参考答案原值：${q.answers.join('；')}；解析：${q.analysis}`, activityRef(d.activity));
      }
    } else if (d.questions?.length) add(`paper-${d.activity.id}`, '试卷范围', `共 ${d.questions.length} 道题。面向班级的提醒不包含标准答案、解析或个人成绩。`, activityRef(d.activity));
    if (d.classroomResult) {
      const r = d.classroomResult;
      add(`report-${d.activity.id}`, '课后报告实际数据', `${r.message} ${r.attendance ? `应到${r.attendance.expected}、实到${r.attendance.actual}、迟到${r.attendance.late}人。` : '出勤未取得。'} 时长${r.durationSeconds ?? '未取得'}秒；高光${r.highlights ?? '未取得'}；板书${r.blackboards ?? '未取得'}。AI分析状态${r.aiAnalysis}；未将AI推断当成学生实际表现。`, activityRef(d.activity));
      if (use === 'private-assistance' && /笔记|课堂内容|讲了什么|讲解|知识点|总结|回顾|复盘/.test(query)) for (const note of r.notes) add(`note-${note.id}`, '教师本人课堂笔记（未与授课时间轴对齐）', note.text, activityRef(d.activity));
    }
    for (const r of isLessonReview ? [] : d.resources) {
      add(`resource-${d.activity.id}-${r.name}`, '资源', `${r.name}；${r.state}`, activityRef(d.activity));
      if (r.document) add(`document-${d.activity.id}-${r.id}`, '实际PDF资料正文', `${r.document.message} ${r.document.text}`, activityRef(d.activity));
    }
    if (d.activity.kind === 'classroom' && /配套|同单元|资料/.test(query)) {
      const companions = scene.activities.filter((item) => item.unitId === d.activity.unitId && item.id !== d.activity.id && item.published && !item.cancelled);
      add(`companions-${d.activity.id}`, '同单元配套活动', companions.length ? companions.map((item) => `${kindLabels[item.kind]}《${item.name}》；开始${calendarLabel(item.startsAt)}；结束/截止${calendarLabel(item.endsAt)}`).join('\n') : '该课堂所在单元没有其他已发布活动。只按相同单元ID关联，不按名称猜测。', activityRef(d.activity));
    }
  }
  if (supplement.lessonReview) {
    const review = supplement.lessonReview;
    add('transcript-coverage', '课堂AI转写读取范围', `回放文件${review.transcript.fileCount}个，可读${review.transcript.usableFileCount}个，共${review.transcript.segmentCount}段；状态${review.transcript.status}。${review.transcript.limitation}`);
    if (review.transcript.text) add('transcript-content', '课堂AI转写原文（含文件内相对时间）', review.transcript.text);
    add('ai-analysis-boundary', 'AI授课分析范围', `状态${review.aiAnalysis.status}。${review.aiAnalysis.limitation}`);
    if (review.aiAnalysis.text) add('ai-analysis-content', 'AI授课分析（AI生成）', review.aiAnalysis.text);
  }
  if (supplement.historicalAttendance) {
    const attendance = supplement.historicalAttendance;
    const ordered = [...attendance.lessons].sort((left, right) => (left.activity.startsAt ?? '').localeCompare(right.activity.startsAt ?? ''));
    add('attendance-coverage', '历史出勤统计范围', `覆盖最近${attendance.lessons.length}节已结束课堂，从${calendarLabel(ordered[0]?.activity.startsAt ?? null)}到${calendarLabel(ordered.at(-1)?.activity.endsAt ?? null)}。${attendance.limitation}`);
    for (const lesson of ordered) {
      const privateDetail = use === 'private-assistance' ? `。${lesson.students.map((student) => `${student.name}：${student.attended ? '到课' : '缺席'}${student.late ? '、迟到' : ''}${student.earlyLeave ? '、早退' : ''}，在课${student.durationSeconds}秒`).join('；')}` : '';
      add(`attendance-${lesson.activity.id}`, `课堂出勤明细：${lesson.activity.name}`, `应到${lesson.expectedCount}人；到课${lesson.attendedCount}人；缺席${lesson.expectedCount - lesson.attendedCount}人；迟到${lesson.lateCount}人；早退${lesson.earlyLeaveCount}人${privateDetail}`, activityRef(lesson.activity), use === 'private-assistance' ? 'student-personal' : 'standard');
    }
    const students = new Map<string, { name: string; absent: number; late: number; early: number }>();
    for (const lesson of attendance.lessons) for (const student of lesson.students) {
      const total = students.get(student.id) ?? { name: student.name, absent: 0, late: 0, early: 0 };
      if (!student.attended) total.absent += 1;
      if (student.late) total.late += 1;
      if (student.earlyLeave) total.early += 1;
      students.set(student.id, total);
    }
    if (use === 'private-assistance') add('attendance-aggregate', '按学生聚合（可由逐课明细复算）', [...students.values()].map((student) => `${student.name}：缺席${student.absent}次、迟到${student.late}次、早退${student.early}次`).join('；'), ref, 'student-personal');
  }
  if (supplement.questionAggregation) {
    const aggregate = supplement.questionAggregation;
    add('question-aggregate-coverage', '逐题统计范围与口径', `统计窗口从${calendarLabel(aggregate.window.from)}到${calendarLabel(aggregate.window.to)}；纳入${aggregate.includedActivities.length}项已结束测验。${aggregate.rule}`);
    for (const activity of aggregate.includedActivities) add(`question-aggregate-activity-${activity.id}`, `纳入测验：${activity.name}`, `结束${calendarLabel(activity.endsAt)}；分配${activity.assignedCount}人；共${activity.questionCount}题。`, `classin-test:activity:${activity.id}`);
    for (const excluded of aggregate.excludedActivities) add(`question-aggregate-excluded-${excluded.id}`, `未纳入：${excluded.name}`, excluded.reason, `classin-test:activity:${excluded.id}`);
    const ranked = aggregate.questions.filter((question) => question.validCount > 0).sort((left, right) => ((right.wrongCount + right.partialCount) / right.validCount) - ((left.wrongCount + left.partialCount) / left.validCount) || (right.wrongCount + right.partialCount) - (left.wrongCount + left.partialCount) || left.position - right.position);
    for (const question of ranked) add(`question-aggregate-${question.activityId}-${question.topicId}`, `${question.activityName} · 第${question.position}题`, `${question.content || (question.hasImage ? '题面含图片，未取得可读文字题干' : '接口未提供可读文字题干')}${question.hasImage ? '（含图片）' : ''}；有效判定${question.validCount}/${question.assignedCount}人；正确${question.correctCount}人；错误${question.wrongCount}人；部分正确${question.partialCount}人；未完全正确${question.wrongCount + question.partialCount}人；待批阅${question.pendingCount}人；未作答${question.unansweredCount}人；未参与${question.nonParticipantCount}人。`, `classin-test:activity:${question.activityId}`);
  }
  if (supplement.learningSummary) {
    const learning = supplement.learningSummary; const target = supplement.targetStudentId ? learning.students.find((student) => student.id === supplement.targetStudentId) : undefined;
    add('learning-coverage', '受限学情聚合范围', `${learning.period.label}：从${calendarLabel(learning.period.from)}到${calendarLabel(learning.period.to)}；覆盖当前班级${learning.coverage.studentCount}名学生、${learning.coverage.activityCount}项有可核验状态的活动（课堂${learning.coverage.byKind.classroom}、作业${learning.coverage.byKind.homework}、测验${learning.coverage.byKind.exam}、录播${learning.coverage.byKind.recording}）。${learning.limitations.join('')}`);
    const stateLabel = { complete: '已完成', incomplete: '当前未完成', overdue: '已逾期未完成', future: '未来任务', observed: '已观察', unknown: '状态未知' } as const;
    if (target) {
      const taskRecords = target.records.filter((record) => record.activity.kind !== 'classroom'); const attendanceRecords = target.records.filter((record) => record.activity.kind === 'classroom');
      add(`student-learning-summary-${target.id}`, '个人任务状态汇总（课堂出勤不计入）', `学习任务已完成${taskRecords.filter((record) => record.state === 'complete').length}项、当前未完成${taskRecords.filter((record) => record.state === 'incomplete').length}项、已逾期未完成${taskRecords.filter((record) => record.state === 'overdue').length}项、未来任务${taskRecords.filter((record) => record.state === 'future').length}项；课堂出勤另列${attendanceRecords.length}节，禁止归入上述四类。`, `classin-test:student:${target.id}`, 'student-personal');
      for (const record of target.records) add(`student-learning-${target.id}-${record.activity.id}`, `${target.name} · ${record.activity.kind === 'classroom' ? '课堂出勤事实（不是任务完成状态）' : kindLabels[record.activity.kind]} · ${record.activity.name}`, `${stateLabel[record.state]}；接口状态${record.status}；开始${calendarLabel(record.activity.startsAt)}；结束/截止${calendarLabel(record.activity.endsAt)}${record.grade ? `；成绩${record.grade}` : ''}${record.progress === null ? '' : `；进度${record.progress}%`}${record.durationSeconds === null ? '' : `；时长${record.durationSeconds}秒`}`, `classin-test:student:${target.id}`, 'student-personal');
      add(`student-learning-boundary-${target.id}`, '个人学情边界', '以上只陈述已核验活动状态；不据此评价进步、学习态度、能力或错因。家长沟通内容仅供老师审阅，不代表已发送或当前班级群可发送。', `classin-test:student:${target.id}`, 'student-personal');
    } else {
      for (const activity of [...new Map(learning.students.flatMap((student) => student.records.map((record) => [record.activity.id, record.activity] as const))).values()]) {
        const records = learning.students.map((student) => student.records.find((record) => record.activity.id === activity.id)!).filter(Boolean);
        const counts = new Map<string, number>(); records.forEach((record) => counts.set(stateLabel[record.state], (counts.get(stateLabel[record.state]) ?? 0) + 1));
        const statusCounts = new Map<string, number>(); records.forEach((record) => statusCounts.set(record.status, (statusCounts.get(record.status) ?? 0) + 1));
        const result = activity.kind === 'classroom' ? [...statusCounts].map(([status, count]) => `${status}${count}人`).join('、') : [...counts].map(([state, count]) => `${state}${count}人`).join('、');
        add(`class-learning-${activity.id}`, `${activity.kind === 'classroom' ? '班级课堂出勤事实（不是任务完成状态）' : '班级任务状态'}：${activity.name}`, `${kindLabels[activity.kind]}；学生覆盖${records.length}/${learning.coverage.studentCount}人（覆盖只表示读取完整，不能称为到课或满勤）；${result}；开始${calendarLabel(activity.startsAt)}；结束/截止${calendarLabel(activity.endsAt)}`, activityRef(activity));
      }
      add('future-schedule', '未来课堂安排（不计入已完成）', learning.futureSchedule.length ? learning.futureSchedule.map((activity) => `${activity.name}：${calendarLabel(activity.startsAt)}`).join('；') : '当前自然周没有后续已发布课堂。');
    }
  }
  if (supplement.chatContext) {
    const first = supplement.chatContext.messages[0]?.sentAt ?? null;
    const last = supplement.chatContext.messages.at(-1)?.sentAt ?? null;
    const requestedRange = supplement.chatContext.from ? `请求起点${calendarLabel(supplement.chatContext.from, true)}` : '引用消息及当前快照实际可读范围';
    add('im-coverage', '真实群聊读取范围', `${requestedRange}；本次实际读取${supplement.chatContext.messages.length}条原始正文，实际消息时间从${calendarLabel(first, true)}到${calendarLabel(last, true)}，时区Asia/Shanghai。消息快照不代表完整分页；有多少读取到的正文就处理多少。`);
  }
  if (supplement.referencedQuestion) {
    const question = supplement.referencedQuestion;
    add('referenced-question-identity', '引用消息对应的作业题', `唯一定位到《${question.activity.name}》第${question.position}题，活动${question.activity.id}，题图资源${question.resourceName}。题面来自${question.textSource}，OCR可能误识别，数学符号和数值必须在回答中复核。`, activityRef(question.activity));
    add('referenced-question-text', '题图OCR原文', question.text, activityRef(question.activity));
    add('referenced-question-solution-boundary', '解析来源边界', 'ClassIn作业接口没有提供该图片题的标准解析；回答中的解法属于模型新生成，必须逐步验算并明确标注为AI讲解，不能称为老师标准答案。', activityRef(question.activity));
  }
  const chatVersion = supplement.chatContext ? `${supplement.chatContext.capturedAt}:${supplement.chatContext.messages.length}:${supplement.chatContext.messages.at(-1)?.id ?? 'empty'}` : undefined;
  const versions = [scene.version, ...details.map((d) => d.version), supplement.courseProgress?.version, supplement.historicalAttendance?.version, supplement.questionAggregation?.version, supplement.learningSummary?.version, supplement.referencedQuestion?.version, supplement.lessonReview?.version, chatVersion].filter(Boolean);
  const version = versions.join(':');
  const objectRefs = [...new Set([...details.map(({ activity }) => activityRef(activity)), ...(supplement.historicalAttendance?.lessons.map(({ activity }) => activityRef(activity)) ?? []), ...(supplement.questionAggregation?.includedActivities.map(({ id }) => `classin-test:activity:${id}`) ?? []), ...(supplement.targetStudentId ? [`classin-test:student:${supplement.targetStudentId}`] : []), ...(supplement.chatContext?.referenceId ? [`classin-test:message:${supplement.chatContext.referenceId}`] : []), ...(supplement.referencedQuestion ? [activityRef(supplement.referencedQuestion.activity)] : [])])];
  const route: ClassInToolRouteReceipt | undefined = supplement.route ? { questionId: supplement.route.questionId, requestedToolIds: supplement.route.tools, executedToolIds: supplement.route.tools,
    actorRef: scene.teacher.id, tenantRef: scene.schoolRef, threadRef: ref, objectRefs, contextVersion: version, capturedAt: scene.capturedAt } : undefined;
  return { id: `${ref}:${version}`, version, actorRef: scene.teacher.id, tenantRef: scene.schoolRef, threadRef: ref, channel: 'class', use, focusRefs: objectRefs,
    toolRoute: route,
    sources: [source].map((sourceRef) => ({ kind: 'classin-api', owner: 'ClassIn', sourceRef, permissionScope: `${scene.teacher.id}:${ref}`, capturedAt: scene.capturedAt, freshness: 'current', version })),
    items, recentMessages: [], chatContext: supplement.chatContext, excludedSensitiveCount: use === 'message-draft' ? details.reduce((n, d) => n + d.students.length, 0) + (supplement.historicalAttendance?.lessons.reduce((n, lesson) => n + lesson.students.length, 0) ?? 0) : 0, truthLabel: 'read-only-business-data' };
}
