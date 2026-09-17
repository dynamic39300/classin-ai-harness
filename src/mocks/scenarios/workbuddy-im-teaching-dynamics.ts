import type {
  TeachingDynamicItem,
  TeachingDynamicsRequest,
  TeachingDynamicsSnapshot,
  TeachingStageId,
} from '@contracts/workbuddy/teaching-dynamics';
import { normalizeTeachingDynamics } from '@domain/workbuddy/teaching-dynamics';

const PHYSICS_CLASS_ID = 'physics-3';
const PHYSICS_DIRECT_THREAD_ID = 'direct-wang-li';
const DW_CLASS_ID = 'dw-expression-lab';
const DW_DIRECT_THREAD_ID = 'direct-dw-lin';

const PHYSICS_LESSON_START = new Date('2026-08-09T14:30:00+08:00').getTime();
const PHYSICS_LESSON_END = new Date('2026-08-09T15:20:00+08:00').getTime();
const QUIZ_DUE = new Date('2026-08-09T21:00:00+08:00').getTime();
const HOMEWORK_DUE = new Date('2026-08-10T18:00:00+08:00').getTime();
const CORRECTION_DUE = new Date('2026-08-12T18:00:00+08:00').getTime();
export const TEACHING_DYNAMICS_DEMO_NOW = new Date('2026-08-09T14:40:00+08:00');

function action(
  label: string,
  teacherRequest: string,
  learningSelection?: NonNullable<TeachingDynamicItem['action']>['learningSelection'],
  contextRefs?: readonly string[],
) {
  return Object.freeze({
    label,
    teacherRequest,
    ...(learningSelection ? { learningSelection } : {}),
    ...(contextRefs?.length ? { contextRefs: Object.freeze([...contextRefs]) } : {}),
  });
}

function physicsItems(now: Date, direct: boolean, classLabel: string): readonly TeachingDynamicItem[] {
  const timestamp = now.getTime();
  const studentRef = direct ? 'student-001' : 'all-pending';
  const items: TeachingDynamicItem[] = [];

  if (!direct && timestamp < CORRECTION_DUE) {
    items.push({
      id: 'physics-study-plan-overview', recommendationKey: 'P01', stage: 'before', kind: 'progress', priority: 90,
      contextLabel: '高二物理 · 3 门课',
      title: '3 门课已学 8 讲，还剩 4 讲', detail: '动量守恒学到碰撞模型；接下来学习电磁感应',
      courseRef: 'physics-momentum', objectRef: 'period-current-unit',
      action: action('同步计划', '请把本班 3 门物理课的学习进度整理成一条群消息：已完成 8 讲，动量守恒学到碰撞模型，接下来学习电磁感应，后续还有 4 讲。', undefined, ['plan-physics-2026-summer']),
    });
  }

  if (timestamp < PHYSICS_LESSON_START) {
    items.push({
      id: 'physics-upcoming-momentum-class', recommendationKey: 'P02', stage: 'before', kind: 'attention', priority: 100,
      contextLabel: direct ? '李明 · 动量守恒模型 · 私聊' : `${classLabel} · 动量守恒模型 · 在线课堂`,
      title: '今天 14:30 开课', detail: direct ? '可提前确认李明能否按时进入课堂' : '提醒全班提前进入课堂，准备讲义和练习单',
      courseRef: 'physics-momentum', objectRef: 'lesson-momentum-0809',
      action: action(direct ? '询问到课' : '提醒上课', direct ? '请结合今天 14:30 的动量守恒模型课，询问李明是否能按时进入课堂，并生成一条简洁、友好的私聊消息。' : '请结合今天 14:30 的动量守恒模型课，为全班生成一条简洁的课前进入课堂提醒。', {
        capability: 'personalized-reminder', studentRef, reminderReasonRef: 'schedule-change',
      }, ['physics-momentum', 'lesson-momentum-0809']),
    });
  }

  if (!direct && timestamp < CORRECTION_DUE) {
    items.push({
      id: 'physics-upcoming-induction-class', recommendationKey: 'P02', stage: 'before', kind: 'attention', priority: 75,
      contextLabel: `${classLabel} · 电磁感应 · 明天 19:00 在线课堂`,
      title: '明天 19:00 开课', detail: '提醒全班提前进入课堂，准备讲义和预习单',
      courseRef: 'physics-induction', objectRef: 'lesson-induction-0810',
      action: action('提醒上课', '请为明天 19:00 的电磁感应课生成一条群提醒，提醒同学们准时进入课堂，并准备好讲义和预习单。', undefined, ['physics-induction', 'lesson-induction-0810']),
    });
  }

  if (timestamp >= PHYSICS_LESSON_START && timestamp < PHYSICS_LESSON_END) {
    items.push({
      id: 'physics-live-attendance', recommendationKey: direct ? undefined : 'P03', stage: 'during', kind: direct ? 'confirmation' : 'attention', priority: 110,
      contextLabel: direct ? '李明 · 动量守恒模型 · 在线课堂' : `${classLabel} · 动量守恒模型 · 在线课堂`,
      title: direct ? '李明已进入课堂' : '已上课 10 分钟，3 人未进入',
      detail: direct ? '当前无需发送到课提醒' : '李明、周然、陈晨尚未进入课堂，可发送一条尊重、不责备的提醒',
      courseRef: 'physics-momentum', objectRef: 'lesson-momentum-0809',
      ...(!direct ? { action: action('提醒上课', '请根据当前到课情况生成一条简洁、尊重、不责备的提醒：动量守恒模型课已经开始 10 分钟，李明、周然、陈晨还没有进入课堂。', {
        capability: 'personalized-reminder', studentRef: 'all-pending', reminderReasonRef: 'attendance',
      }, ['physics-momentum', 'attendance-momentum-0809']) } : {}),
    });
    if (!direct) {
      items.push({
        id: 'physics-live-full-attendance', stage: 'during', kind: 'confirmation', priority: 35,
        contextLabel: `${classLabel} · 机械波基础 · 在线课堂`,
        title: '已上课 15 分钟，全员到齐', detail: '30 人已进入课堂，当前无需发送提醒', courseRef: 'physics-wave',
        objectRef: 'lesson-wave-0808',
      });
    }
  }

  if (!direct && timestamp < CORRECTION_DUE) {
    items.push({
      id: 'physics-learning-tasks', recommendationKey: 'P04', stage: 'after', kind: 'attention', priority: 108,
      contextLabel: '机械波基础 · 8月8日课后任务',
      title: '本讲安排了 3 份作业、1 次测验', detail: '已下课，可向全班同步任务内容和截止时间',
      courseRef: 'physics-wave', objectRef: 'lesson-wave-0808',
      action: action('同步任务', '请把机械波基础课后的学习任务整理成一条群消息：包括 3 份作业、1 次测验，以及各自的截止时间。', undefined, ['physics-wave', 'lesson-wave-0808', 'task-plan-wave-0808']),
    });
  }

  if (timestamp < HOMEWORK_DUE) {
    items.push({
      id: 'physics-new-homework', recommendationKey: 'P05', stage: 'after', kind: 'attention', priority: 105,
      contextLabel: direct ? '李明 · 动量守恒作业 A 组 · 私聊' : `${classLabel} · 动量守恒作业 A 组`,
      title: direct ? '李明尚未提交，明天 18:00 截止' : '明天 18:00 截止，6 人未交',
      detail: direct ? '可提醒李明按时提交，有困难可以先反馈' : '李明、周然等 6 人尚未提交，可发送一条作业提醒',
      courseRef: 'physics-momentum', objectRef: 'homework-momentum-a',
      action: action('提醒交作业', direct ? '请提醒李明在明天 18:00 前提交动量守恒作业 A 组，并说明有困难可以先反馈。' : '请提醒本班尚未提交的 6 位学生在明天 18:00 前完成动量守恒作业 A 组，语气简洁且不责备。', {
        capability: 'personalized-reminder', studentRef, assignmentRef: 'homework-momentum-a', reminderReasonRef: 'homework-submission',
      }, ['homework-momentum-a']),
    });
  }

  if (!direct && timestamp < QUIZ_DUE) {
    items.push({
      id: 'physics-quiz-submission', recommendationKey: 'P06', stage: 'after', kind: 'attention', priority: 100,
      contextLabel: '动量守恒随堂测验',
      title: '今晚 21:00 截止，5 人未交', detail: '周然、陈晨等 5 人尚未提交，可发送一条测验提醒',
      courseRef: 'physics-momentum', objectRef: 'quiz-momentum-check',
      action: action('提醒交测验', '请提醒尚未提交的 5 位同学在今晚 21:00 前完成动量守恒随堂测验，语气简洁且不责备。', undefined, ['physics-momentum', 'quiz-momentum-check']),
    });
  }

  if (timestamp < CORRECTION_DUE && direct) {
    items.push({
      id: 'physics-correction', stage: 'after', kind: 'attention', priority: 70,
      contextLabel: '李明 · 机械波错题订正 · 私聊',
      title: '订正待完善，8月12日 18:00 截止', detail: '可根据课堂反馈提醒李明完善后提交', objectRef: 'homework-correction',
      action: action('提醒订正', '请提醒李明根据课堂反馈完善机械波错题订正，并在 8月12日 18:00 前提交。', {
        capability: 'personalized-reminder', studentRef: 'student-001', assignmentRef: 'homework-correction', reminderReasonRef: 'homework-correction',
      }, ['physics-wave', 'task-plan-wave-0808']),
    });
  }

  if (!direct && timestamp < CORRECTION_DUE) {
    items.push({
      id: 'physics-wrong-question-cards', recommendationKey: 'P07', stage: 'after', kind: 'teacher-task', priority: 80,
      contextLabel: '最近 2 次作业 · 7 道高频错题',
      title: '5 位同学集中答错 7 道题', detail: '生成题面与解析双面错题卡，确认后发到班群', objectRef: 'homework-correction',
      action: action('生成错题卡', '请根据最近 2 次物理作业，整理 5 位同学集中答错的 7 道题，生成包含题面、典型错因和解题过程的双面错题卡，供我确认后发到班群。', undefined, ['wrong-question-set-physics-recent']),
    });
  }

  if (direct) {
    items.push({
      id: 'physics-class-recap', recommendationKey: 'P08', stage: 'summary', kind: 'progress', priority: 65,
      contextLabel: '李明 · 动量守恒模型 · 8月8日课堂',
      title: '可以整理李明的本讲回顾', detail: '归纳本讲知识点、课堂练习和课后任务', objectRef: 'lesson-momentum-0808',
      action: action('生成回顾', '请根据动量守恒模型课的现有证据，为李明整理一份本讲课堂回顾。', {
        capability: 'class-recap', studentRef: 'student-001', lessonRef: 'lesson-momentum-0808',
      }, ['student-001']),
    });
    items.push({
      id: 'physics-learning-summary', recommendationKey: 'P10', stage: 'summary', kind: 'progress', priority: 35,
      contextLabel: '李明 · 高二物理 · 本周',
      title: '可以整理李明的本周学情', detail: '归纳阶段进展、困难和下一步', objectRef: 'period-this-week',
      action: action('个人总结', '请整理李明本周课堂、作业和互动证据，生成一份个人学情总结；只陈述可核验事实。', {
        capability: 'learning-summary', studentRef: 'student-001', periodRef: 'period-this-week',
      }, ['student-001']),
    });
  } else {
    items.push({
      id: 'physics-class-recap', recommendationKey: 'P08', stage: 'summary', kind: 'progress', priority: 80,
      contextLabel: '机械波基础 · 8月8日课堂',
      title: '本讲回顾可以发给全班', detail: '整理知识点、课堂练习和课后任务', objectRef: 'lesson-wave-0808',
      action: action('生成回顾', '请根据机械波基础课的现有证据，整理本讲知识点、课堂练习和课后任务，生成一条可发到班群的课堂回顾。', undefined, ['physics-wave', 'lesson-wave-0808', 'task-plan-wave-0808']),
    });
    items.push({
      id: 'physics-class-learning-summary', recommendationKey: 'P09', stage: 'summary', kind: 'progress', priority: 55,
      contextLabel: '高二物理 · 本周学情',
      title: '可以整理本班阶段学情', detail: '汇总 3 门课的进度、共性问题和下一步', objectRef: 'period-this-week',
      action: action('整班总结', '请汇总本班 3 门物理课的课堂、作业和测验证据，整理学习进度、共性问题和下一步，生成一份可发到班群的阶段学情总结。', undefined, ['plan-physics-2026-summer', 'period-this-week']),
    });
    items.push({
      id: 'physics-student-learning-summary', recommendationKey: 'P10', stage: 'summary', kind: 'progress', priority: 40,
      contextLabel: '李明 · 动量守恒单元',
      title: '可以整理李明的个人学情', detail: '归纳课堂表现、作业情况和下一步建议', objectRef: 'period-current-unit',
      action: action('个人总结', '请根据李明在动量守恒单元的课堂、作业和互动证据，整理个人学习进展、困难和下一步建议；只陈述可核验事实。', {
        capability: 'learning-summary', studentRef: 'student-001', periodRef: 'period-current-unit',
      }, ['student-001']),
    });
  }

  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function dwItems(direct: boolean, classLabel: string): readonly TeachingDynamicItem[] {
  const studentRef = direct ? 'dw-student-001' : 'dw-all-follow-up';
  return Object.freeze([
    Object.freeze({
      id: 'dw-class-confirmation', stage: 'before' as const, kind: 'attention' as const, priority: 80,
      contextLabel: direct ? '林悦 · 表达与思辨课 · 私聊' : `${classLabel} · 下次在线课堂`,
      title: direct ? '林悦的到课情况尚未确认' : '近期有迟到、请假或未回执记录',
      detail: direct ? '当前数据未确认林悦是否到课，可以先询问' : '可以在下次课前向学生确认到课安排', objectRef: 'dw-task-class-confirmation',
      action: action('询问到课', '请根据近期沟通，生成一条课前到课确认消息。缺少学生回执时使用“请确认”，不要判定缺席。', {
        capability: 'personalized-reminder', studentRef, reminderReasonRef: 'attendance',
      }),
    }),
    Object.freeze({
      id: 'dw-current-data-boundary', stage: 'during' as const, kind: 'unknown' as const, priority: 20,
      contextLabel: `${classLabel} · 当前课堂`,
      title: '当前课堂状态暂时无法确认', detail: '已有数据不是实时数据，暂不判断此刻是否正在上课',
    }),
    Object.freeze({
      id: 'dw-vocabulary-follow-up', stage: 'after' as const, kind: 'attention' as const, priority: 95,
      contextLabel: direct ? '林悦 · 重点词汇复习与造句 · 私聊' : `${classLabel} · 重点词汇复习与造句`,
      title: '学习建议已发出，尚未收到学生回复', detail: '可以友好地询问完成进展，不把没有回复判断为未完成', objectRef: 'dw-task-vocabulary',
      action: action('询问进展', '请结合已经发出的词汇复习与造句建议，生成一条询问完成进展的消息。数仓未见回执不等于未完成，请避免下结论。', {
        capability: 'personalized-reminder', studentRef: 'dw-student-001', assignmentRef: 'dw-task-vocabulary', reminderReasonRef: 'homework-submission',
      }),
    }),
    Object.freeze({
      id: 'dw-class-recap', stage: 'summary' as const, kind: 'progress' as const, priority: 60,
      contextLabel: direct ? '林悦 · Problem–Solution 表达 · 已结课' : `${classLabel} · Problem–Solution 表达 · 已结课`,
      title: '本讲可以生成课堂回顾', detail: '根据已有课堂主题整理，缺少的个人发言会明确说明', objectRef: 'dw-lesson-problem-solution',
      action: action('生成回顾', '请根据 Problem–Solution 表达课的现有证据生成课堂回顾；没有个人课堂证据的部分请明确说明，不得补写。', {
        capability: 'class-recap', studentRef: 'dw-student-001', lessonRef: 'dw-lesson-problem-solution',
      }),
    }),
    Object.freeze({
      id: 'dw-learning-summary', stage: 'summary' as const, kind: 'progress' as const, priority: 40,
      contextLabel: direct ? '林悦 · 表达与思辨课 · 近 30 天' : `${classLabel} · 近 30 天学情`,
      title: '可以整理阶段学情总结', detail: '归纳已核验的进展、关注点与下一步', objectRef: 'dw-period-30-days',
      action: action('生成总结', '请整理近 30 天可核验的课堂与个别反馈，形成学情总结；避免把缺少回执写成未完成。', {
        capability: 'learning-summary', studentRef: 'dw-student-001', periodRef: 'dw-period-30-days',
      }),
    }),
  ]);
}

function unknownItems(): readonly TeachingDynamicItem[] {
  return Object.freeze([Object.freeze({
    id: 'unrecognized-teaching-context', stage: 'before' as const, kind: 'unknown' as const, priority: 1,
    title: '暂未识别到当前聊天的教学事项', detail: '你仍可以直接告诉 TeachBuddy 想和谁沟通、需要说明什么',
  })]);
}

function stageForPhysics(now: Date): TeachingStageId {
  const timestamp = now.getTime();
  if (timestamp < PHYSICS_LESSON_START) return 'before';
  if (timestamp < PHYSICS_LESSON_END) return 'during';
  if (timestamp < HOMEWORK_DUE) return 'after';
  return 'summary';
}

function stableVersion(input: string) {
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `teaching-dynamics-${(hash >>> 0).toString(16)}`;
}

export function createTeachingDynamicsSnapshot(request: TeachingDynamicsRequest, now: Date): TeachingDynamicsSnapshot {
  const direct = request.target.kind === 'direct' || request.target.threadId.startsWith('direct-');
  const physics = request.target.classId === PHYSICS_CLASS_ID || request.target.threadId === PHYSICS_DIRECT_THREAD_ID;
  const dw = request.target.classId === DW_CLASS_ID || request.target.threadId === DW_DIRECT_THREAD_ID;
  const items = physics ? physicsItems(now, direct, request.target.classLabel) : dw ? dwItems(direct, request.target.classLabel) : unknownItems();
  const currentStage = physics ? stageForPhysics(now) : dw ? 'after' : 'before';
  const stages = (['before', 'during', 'after', 'summary'] as const).map((id) => Object.freeze({
    id,
    items: Object.freeze(items.filter(({ stage }) => stage === id)),
  }));
  const versionSeed = [request.target.threadId, currentStage, ...items.map(({ id }) => id)].join('|');
  return normalizeTeachingDynamics(Object.freeze({
    threadRef: request.target.threadId,
    currentStage,
    stages: Object.freeze(stages),
    capturedAt: now.toISOString(),
    version: stableVersion(versionSeed),
    sourceRefs: Object.freeze(dw ? ['dw-derived-im-2026-09-07-v1'] : physics ? ['fixed-class-physics-3-prompt-inventory-v2'] : ['fixed-unrecognized-context-v1']),
    truthLabel: dw ? 'read-only-business-data' : 'fixed-demo',
  }));
}
