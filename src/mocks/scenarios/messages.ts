import type { MessageContact, MessageEntry, MessageThread } from '@domain/message/message';
import type { ClassAgentDefinition } from '@domain/class-agent/class-agent';
import { projectMessagePublicationThreads } from '@domain/message/message-publication';
import { OPEN_COURSE_RECORDS } from './classes';
import { MESSAGE_PUBLICATION_SNAPSHOT } from './message-publication';
import {
  ENDED_ENGLISH_TEMPORARY_CLASSROOM_CARD,
  LIVE_PHYSICS_TEMPORARY_CLASSROOM_CARD,
} from './message-object-cards';
import {
  CLASS_AGENT_DEFINITIONS,
  PUBLIC_CLASS_AGENT_BINDINGS,
  createDirectClassAgentBinding,
} from './class-agent';

export const MESSAGE_NOW = new Date('2026-08-08T14:20:00+08:00');

const INSIGHT_PEERS = [
  ['student-001', '王小明'],
  ['student-002', '李华'],
  ['student-003', '张三'],
  ['student-004', '赵英'],
  ['student-005', '陈晨'],
  ['student-006', '周然'],
  ['student-007', '孙悦'],
  ['student-008', '刘洋'],
] as const;

const INSIGHT_DIRECT_THREADS: ReadonlyArray<MessageThread> = INSIGHT_PEERS.map(([peerId, name]) => ({
  id: `direct-insight-${peerId}`,
  category: 'direct',
  visibleTo: ['teacher'],
  titleByRole: { teacher: name },
  subtitleByRole: { teacher: '学生 · 教学洞察' },
  avatarByRole: { teacher: name.slice(0, 1) },
  updatedAt: '2026-08-06T08:00:00+08:00',
  unreadByRole: { teacher: 0 },
  peerId,
  entries: [],
}));

function getAgentDirectThreadId(agentId: string, role: 'teacher' | 'student-family'): string {
  return `direct-${agentId.replace('class-agent-', 'class-agent-')}-${role === 'teacher' ? 'teacher' : 'student'}`;
}

const AGENT_HISTORY_COPY: Record<string, Readonly<{
  prompts: readonly string[];
  replies: readonly string[];
}>> = {
  'explain-physics-reasoning': {
    prompts: ['动量方向的正负号应该先看什么？', '如果物体反弹，速度怎么写？', '列式后我总怕单位漏掉。', '能给我一个检查守恒式的方法吗？', '我重新算完了，下一步怎么自检？'],
    replies: ['先规定同一条直线上的正方向，再给每个速度带上方向符号。', '反弹说明速度方向改变；若原方向为正，反弹后的速度就写成负值。', '先统一质量和速度单位，再检查等式两边是否都是 kg·m/s。', '分别算碰撞前后的总动量；数值相等且方向符号一致，才说明列式自洽。', '最后把结果代回原式，并用正负号解释实际运动方向。'],
  },
  'homework-correction-guidance': {
    prompts: ['订正时先抄正确答案吗？', '怎么找出我真正错在哪一步？', '原来的错误过程要删掉吗？', '订正完成后怎么检查？', '我已经标出正方向错误了。'],
    replies: ['先保留原答案，逐项对照题目条件，不要直接抄结论。', '按研究对象、已知条件、公式和代入四项定位第一个偏差点。', '建议保留原错误并在旁边写出原因，这样复盘时能看到变化。', '遮住标准答案，重新独立完成关键步骤，再核对单位和方向。', '很好，接下来只重做受影响的列式和计算，不必整题机械重抄。'],
  },
  'experiment-inquiry-guidance': {
    prompts: ['实验方案先确定什么？', '控制变量太多怎么办？', '只测一组数据可以吗？', '误差分析应该写哪些内容？', '我已经画好数据表了。'],
    replies: ['先写清自变量、因变量和需要保持不变的条件。', '一次只改变一个关键变量，其余条件用清单固定。', '至少准备三组可比较数据，才能观察趋势并识别异常点。', '区分仪器精度、操作过程和环境条件，并说明它们会让结果偏大还是偏小。', '下一步检查表头是否包含物理量、单位和重复测量位置。'],
  },
  'learning-plan-guidance': {
    prompts: ['今晚复习从哪里开始？', '我容易在一道题上花太久。', '错题应该怎么安排？', '计划没完成时怎么办？', '今天三个单元都做完了。'],
    replies: ['先用 20 分钟复习概念，再做一题典型题，最后复盘一处错因。', '给每题设一个时间上限；到点先标记卡点，再进入下一任务。', '按错因而不是题号分类，每次只选一类做针对性复盘。', '保留最重要的一个结果，缩短任务数量，不用把未完成全部挤到明天。', '记录每个单元的可检查结果，再决定明天是巩固还是进入新内容。'],
  },
};

function createAgentDirectHistory(agent: ClassAgentDefinition, role: 'teacher' | 'student-family') {
  const authorName = role === 'teacher' ? '王老师' : '李明';
  const copy = AGENT_HISTORY_COPY[agent.capabilityIds[0] ?? ''] ?? AGENT_HISTORY_COPY['explain-physics-reasoning'];
  const entries: MessageEntry[] = [{
    id: `${agent.id}-${role}-welcome`,
    authorRole: 'class-agent' as const,
    authorName: agent.name,
    body: role === 'teacher'
      ? `我是本班已授权的${agent.name}。这条教师私聊与学生线程互相隔离，你可以直接描述需要协助的任务。`
      : `我是本班已授权的${agent.name}。你可以直接提问；这条私聊只对你和当前 Agent 可见。`,
    sentAt: '2026-08-08T08:50:00+08:00',
    kind: 'text' as const,
    classAgent: {
      agentId: agent.id,
      channel: 'private-direct' as const,
      visibilityLabel: '仅你与班级 Agent 可见',
      truthLabel: agent.truthLabel,
    },
  }];
  const hours = ['09:10', '10:05', '11:20', '12:35', '13:50'];
  for (const [index, prompt] of (copy?.prompts ?? []).entries()) {
    entries.push({
      id: `${agent.id}-${role}-history-user-${index + 1}`,
      authorRole: role,
      authorName,
      body: prompt,
      sentAt: `2026-08-08T${hours[index]}:00+08:00`,
      kind: 'text' as const,
      classAgent: undefined,
    });
    entries.push({
      id: `${agent.id}-${role}-history-agent-${index + 1}`,
      authorRole: 'class-agent' as const,
      authorName: agent.name,
      body: copy?.replies[index] ?? '我会根据当前班级范围给出可检查的步骤建议。',
      sentAt: `2026-08-08T${hours[index]}:02+08:00`,
      kind: 'text' as const,
      classAgent: {
        agentId: agent.id,
        channel: 'private-direct' as const,
        visibilityLabel: '仅你与班级 Agent 可见',
        truthLabel: agent.truthLabel,
      },
    });
  }
  return {
    olderEntries: entries.slice(0, 6),
    entries: entries.slice(6),
  };
}

const CLASS_AGENT_DIRECT_THREADS: ReadonlyArray<MessageThread> = CLASS_AGENT_DEFINITIONS.flatMap((agent) => (
  (['teacher', 'student-family'] as const).map((role) => {
    const history = createAgentDirectHistory(agent, role);
    return ({
    id: getAgentDirectThreadId(agent.id, role),
    category: 'direct' as const,
    visibleTo: [role],
    titleByRole: { [role]: agent.name },
    subtitleByRole: { [role]: `班级 Agent · ${agent.classLabel} · ${agent.capabilitySummary}` },
    avatarByRole: { [role]: agent.avatarLabel },
    updatedAt: '2026-08-08T13:50:00+08:00',
    unreadByRole: { [role]: 0 },
    classId: agent.classId,
    peerId: agent.id,
    classAgentBinding: createDirectClassAgentBinding(agent, role),
    entries: history.entries,
    olderEntries: history.olderEntries,
  });
  })
));

export const MESSAGE_THREADS: ReadonlyArray<MessageThread> = [
  ...CLASS_AGENT_DIRECT_THREADS,
  {
    id: 'direct-dw-lin',
    category: 'direct',
    visibleTo: ['teacher'],
    titleByRole: { teacher: '林悦' },
    subtitleByRole: { teacher: '学生 · 表达与思辨体验班 · DW 脱敏样本' },
    avatarByRole: { teacher: '林' },
    updatedAt: '2026-09-07T20:30:00+08:00',
    unreadByRole: { teacher: 0 },
    classId: 'dw-expression-lab',
    entries: [
      { id: 'dw-direct-0', authorRole: 'system', authorName: '数据说明', body: '[真实数据 · 已脱敏] 当前联系人样本只包含数仓可见方向的消息，未出现的学生回执不会被推断为未完成。', sentAt: '2026-09-07T19:58:00+08:00', kind: 'system' },
      { id: 'dw-direct-1', authorRole: 'teacher', authorName: '王老师', body: '今天你对 Problem–Solution 结构理解得不错，能够跟随故事找到问题和解决办法。新词还需要规律复习，可以先选两个词各写一句。', sentAt: '2026-09-07T20:05:00+08:00', kind: 'text' },
      { id: 'dw-direct-2', authorRole: 'teacher', authorName: '王老师', body: '这段时间你在故事要素定位和情节顺序上进步明显。下次试着用“问题—办法—结果”完整复述一个片段，我会继续帮你检查表达是否连贯。', sentAt: '2026-09-07T20:30:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'direct-wang-li',
    category: 'direct',
    visibleTo: ['teacher', 'student-family'],
    titleByRole: { teacher: '李明', 'student-family': '王老师' },
    subtitleByRole: { teacher: '学生 · 高二物理 3 班', 'student-family': '物理老师' },
    avatarByRole: { teacher: '李', 'student-family': '王' },
    updatedAt: '2026-08-08T14:02:00+08:00',
    unreadByRole: { teacher: 2, 'student-family': 0 },
    entries: [
      { id: 'dwl-1', authorRole: 'student-family', authorName: '李明', body: '王老师，今天动量守恒练习单第 5 题我不会，特别是碰后速度的正负号总写反，能讲一下吗？', sentAt: '2026-08-08T13:54:00+08:00', kind: 'text' },
      { id: 'dwl-2', authorRole: 'teacher', authorName: '王老师', body: '我去练习单里找到第 5 题，把正方向、守恒公式和代入计算整理成一份完整讲解。', sentAt: '2026-08-08T13:58:00+08:00', kind: 'text' },
      { id: 'dwl-3', authorRole: 'student-family', authorName: '李明', body: '明白了，我重新画一下过程图。', sentAt: '2026-08-08T14:02:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'direct-teacher-zhang',
    category: 'direct',
    visibleTo: ['teacher'],
    titleByRole: { teacher: '张老师' },
    subtitleByRole: { teacher: '联系人 · 物理教研组' },
    avatarByRole: { teacher: '张' },
    updatedAt: '2026-08-08T11:40:00+08:00',
    unreadByRole: { teacher: 0 },
    entries: [
      { id: 'dtz-0', authorRole: 'system', authorName: '系统', body: '你已添加张老师为好友，现在可以开始聊天了。', sentAt: '2026-08-01T09:30:00+08:00', kind: 'system' },
      { id: 'dtz-1', authorRole: 'teacher', authorName: '王老师', body: '下午的教研会我会带上本周课堂报告。', sentAt: '2026-08-08T11:34:00+08:00', kind: 'text' },
      { id: 'dtz-2', authorRole: 'system', authorName: '张老师', body: '好的，重点看一下 3 班的订正情况。', sentAt: '2026-08-08T11:40:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'direct-student-chen',
    category: 'direct',
    visibleTo: ['student-family'],
    titleByRole: { 'student-family': '陈老师' },
    subtitleByRole: { 'student-family': '英语老师' },
    avatarByRole: { 'student-family': '陈' },
    updatedAt: '2026-08-08T10:12:00+08:00',
    unreadByRole: { 'student-family': 1 },
    entries: [
      { id: 'dsc-1', authorRole: 'system', authorName: '陈老师', body: '阅读训练可以先完成定位题，主旨题明天课上讲。', sentAt: '2026-08-08T10:12:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'direct-student-zhou',
    category: 'direct',
    visibleTo: ['student-family'],
    titleByRole: { 'student-family': '周然' },
    subtitleByRole: { 'student-family': '联系人' },
    avatarByRole: { 'student-family': '周' },
    updatedAt: '2026-08-07T19:30:00+08:00',
    unreadByRole: { 'student-family': 0 },
    entries: [
      { id: 'dsz-1', authorRole: 'student-family', authorName: '李明', body: '实验报告的数据我整理好了。', sentAt: '2026-08-07T19:30:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'class-dw-expression-lab',
    category: 'class',
    visibleTo: ['teacher'],
    titleByRole: { teacher: '表达与思辨体验班' },
    subtitleByRole: { teacher: '14 位活跃成员 · DW 去标识化样本' },
    avatarByRole: { teacher: '思' },
    updatedAt: '2026-09-07T19:30:00+08:00',
    unreadByRole: { teacher: 1 },
    classId: 'dw-expression-lab',
    memberCount: 14,
    entries: [
      { id: 'dw-class-0', authorRole: 'system', authorName: '数据说明', body: '[真实数据 · 已脱敏] 场景来自一组近期客户 IM 行级记录，经过去标识化与业务事实压缩。', sentAt: '2026-09-07T18:40:00+08:00', kind: 'system' },
      { id: 'dw-class-1', authorRole: 'teacher', authorName: '王老师', body: '今晚的表达与思辨课按计划开始，请大家提前进入教室；如果可能迟到或需要请假，请在群里提前说明。', sentAt: '2026-09-07T18:45:00+08:00', kind: 'text' },
      { id: 'dw-class-2', authorRole: 'student-family', authorName: '家长甲', body: '老师，孩子线下课结束后赶回来，可能会晚几分钟，麻烦您了。', sentAt: '2026-09-07T18:50:00+08:00', kind: 'text' },
      { id: 'dw-class-3', authorRole: 'teacher', authorName: '王老师', body: '收到，我会留意他的进入情况，课程仍按原定时间结束。', sentAt: '2026-09-07T18:52:00+08:00', kind: 'text' },
      { id: 'dw-class-4', authorRole: 'teacher', authorName: '王老师', body: '本节课围绕“能否只凭胜负判断英雄”展开。孩子们需要先给出判断，再从行为是否正当、对他人的影响和是否承担责任三个角度说明理由。', sentAt: '2026-09-07T19:25:00+08:00', kind: 'text' },
      { id: 'dw-class-5', authorRole: 'student-family', authorName: '家长乙', body: '老师，今天需要请假，课后回顾我们会及时查看。', sentAt: '2026-09-07T19:30:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'class-physics-3',
    category: 'class',
    visibleTo: ['teacher', 'student-family'],
    titleByRole: { teacher: '高二物理 3 班', 'student-family': '高二物理 3 班' },
    subtitleByRole: { teacher: '30 位成员', 'student-family': '王老师 · 30 位成员' },
    avatarByRole: { teacher: '物', 'student-family': '物' },
    updatedAt: '2026-08-08T14:09:00+08:00',
    unreadByRole: { teacher: 1, 'student-family': 3 },
    classId: 'physics-3',
    memberCount: 30,
    classAgentBindings: PUBLIC_CLASS_AGENT_BINDINGS,
    entries: [
      { id: 'cp3-event-join', authorRole: 'system', authorName: '系统', body: '周然加入班级', sentAt: '2026-08-01T08:30:00+08:00', kind: 'system' },
      { id: 'cp3-event-rename', authorRole: 'system', authorName: '系统', body: '班级名称已更新为“高二物理 3 班”', sentAt: '2026-08-02T09:10:00+08:00', kind: 'system' },
      { id: 'cp3-1', authorRole: 'system', authorName: '系统', body: '动量守恒模型课堂将在 14:30 开始', sentAt: '2026-08-08T13:40:00+08:00', kind: 'system' },
      { id: 'cp3-2', authorRole: 'teacher', authorName: '王老师', body: '@所有人 请大家课前准备好课堂练习单，作业仍在今天 18:00 截止。', sentAt: '2026-08-08T13:48:00+08:00', kind: 'text', mentions: [{ id: 'everyone', kind: 'everyone', label: '所有人' }] },
      {
        id: 'cp3-video-1',
        authorRole: 'teacher',
        authorName: '王老师',
        body: '这是上节课的碰撞实验回放，大家可以结合练习单第 5 题再看一次。',
        sentAt: '2026-08-08T13:52:00+08:00',
        kind: 'text',
        attachments: [{
          id: 'momentum-experiment-video',
          kind: 'video',
          name: '碰撞实验回放.mp4',
          mimeType: 'video/mp4',
          byteSize: 500_579,
          contentRef: '/media/momentum-collision-experiment.mp4',
          posterRef: '/media/momentum-experiment-video-poster.svg',
          source: 'fixture',
          durationSeconds: 5,
          width: 960,
          height: 540,
        }],
      },
      { id: 'cp3-temp-classroom', authorRole: 'teacher', authorName: '王老师', body: '', sentAt: '2026-08-08T14:08:00+08:00', kind: 'text', objectCards: [LIVE_PHYSICS_TEMPORARY_CLASSROOM_CARD] },
      { id: 'cp3-3', authorRole: 'student-family', authorName: '李明', body: '练习单已经准备好了。', sentAt: '2026-08-08T14:08:00+08:00', kind: 'text' },
      { id: 'cp3-4', authorRole: 'student-family', authorName: '李明', body: '@王老师，今天动量守恒练习单第 5 题我不会，特别是碰后速度的正负号总写反，能在群里讲一下吗？', sentAt: '2026-08-08T14:09:00+08:00', kind: 'text', mentions: [{ id: 'teacher-wang', kind: 'person', label: '王老师', actorId: 'teacher-wang' }] },
    ],
  },
  {
    id: 'class-physics-1',
    category: 'class',
    visibleTo: ['teacher'],
    titleByRole: { teacher: '高二物理 1 班' },
    subtitleByRole: { teacher: '32 位成员' },
    avatarByRole: { teacher: '1' },
    updatedAt: '2026-08-08T12:20:00+08:00',
    unreadByRole: { teacher: 0 },
    classId: 'physics-1',
    memberCount: 32,
    entries: [
      { id: 'cp1-1', authorRole: 'teacher', authorName: '王老师', body: '周末学习提醒已发布，请查收。', sentAt: '2026-08-08T12:20:00+08:00', kind: 'text' },
      {
        id: 'cp1-failed-delivery',
        authorRole: 'teacher',
        authorName: '王老师',
        body: '请大家把机械波错题整理到订正本，周一课堂集中讲解。',
        sentAt: '2026-08-08T12:21:00+08:00',
        kind: 'text',
        delivery: {
          status: 'failed',
          clientRequestId: 'seed-request-physics-1',
          attempt: 1,
          failedAt: '2026-08-08T12:21:01+08:00',
          code: 'transient',
          message: '消息发送失败，请稍后重试。',
        },
      },
    ],
  },
  {
    id: 'class-history-physics',
    category: 'class',
    visibleTo: ['teacher', 'student-family'],
    titleByRole: { teacher: '高一物理基础班', 'student-family': '高一物理基础班' },
    subtitleByRole: { teacher: '已结课 · 26 位成员', 'student-family': '已退出 · 历史记录' },
    avatarByRole: { teacher: '旧', 'student-family': '旧' },
    updatedAt: '2026-07-20T12:00:00+08:00',
    unreadByRole: { teacher: 0, 'student-family': 0 },
    classId: 'history-physics',
    memberCount: 26,
    olderEntries: [
      { id: 'history-physics-old-1', authorRole: 'teacher', authorName: '王老师', body: '第一章复习提纲已上传到群文件。', sentAt: '2026-05-18T10:00:00+08:00', kind: 'text' },
      { id: 'history-physics-old-2', authorRole: 'student-family', authorName: '李明', body: '收到，谢谢老师。', sentAt: '2026-05-18T10:06:00+08:00', kind: 'text' },
    ],
    entries: [
      { id: 'history-physics-system', authorRole: 'system', authorName: '系统', body: '班级已于 2026 年 5 月 20 日结课，历史消息与资料继续保留。', sentAt: '2026-05-20T12:00:00+08:00', kind: 'system' },
      { id: 'history-physics-last', authorRole: 'teacher', authorName: '王老师', body: '本学期课程已经结束，大家仍可查阅群文件中的复习资料。', sentAt: '2026-05-20T12:01:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'class-english-2',
    category: 'class',
    visibleTo: ['student-family'],
    titleByRole: { 'student-family': '初三英语 2 班' },
    subtitleByRole: { 'student-family': '陈老师 · 28 位成员' },
    avatarByRole: { 'student-family': '英' },
    updatedAt: '2026-08-08T09:45:00+08:00',
    unreadByRole: { 'student-family': 0 },
    classId: 'english-2',
    memberCount: 28,
    entries: [
      { id: 'ce2-1', authorRole: 'system', authorName: '系统', body: '陈老师发布了阅读训练第 6 讲', sentAt: '2026-08-08T09:30:00+08:00', kind: 'system' },
      { id: 'ce2-temp-classroom', authorRole: 'teacher', authorName: '陈老师', body: '', sentAt: '2026-08-08T09:35:00+08:00', kind: 'text', objectCards: [ENDED_ENGLISH_TEMPORARY_CLASSROOM_CARD] },
      { id: 'ce2-2', authorRole: 'system', authorName: '陈老师', body: '有问题可以在群里集中提出。', sentAt: '2026-08-08T09:45:00+08:00', kind: 'text' },
    ],
  },
  {
    id: 'system-teacher-submissions',
    category: 'system',
    visibleTo: ['teacher'],
    titleByRole: { teacher: '动量守恒作业提交进度更新' },
    subtitleByRole: { teacher: '作业 · 高二物理 3 班' },
    avatarByRole: { teacher: '作' },
    updatedAt: '2026-08-08T13:50:00+08:00',
    unreadByRole: { teacher: 1 },
    entries: [],
    notice: {
      tag: '作业进度',
      body: ['动量守恒作业 A 组已有 24 人提交，仍有 6 人未提交。', '作业将在今天 18:00 截止。阅读本通知不会改变待办的处理状态。'],
      actionLabel: '查看提交概况',
      actionFeedback: '',
      actionTarget: { kind: 'homework', homeworkId: 'homework-momentum-a', view: 'detail' },
      metadata: [{ label: '班级', value: '高二物理 3 班' }, { label: '更新时间', value: '今天 13:50' }],
    },
  },
  {
    id: 'system-teacher-report',
    category: 'system',
    visibleTo: ['teacher'],
    titleByRole: { teacher: '机械波基础课堂报告已生成' },
    subtitleByRole: { teacher: '课堂报告' },
    avatarByRole: { teacher: '报' },
    updatedAt: '2026-08-07T10:20:00+08:00',
    unreadByRole: { teacher: 0 },
    entries: [],
    notice: {
      tag: '课堂报告',
      body: ['机械波基础课堂报告已生成，可以查看课堂参与和随堂练习摘要。'],
      actionLabel: '查看课堂报告',
      actionFeedback: '课堂报告入口已保留，将在教学洞察 Feature 中实现。',
      metadata: [{ label: '班级', value: '高二物理 3 班' }, { label: '课堂时间', value: '8月7日 09:00' }],
    },
  },
  {
    id: 'system-student-returned',
    category: 'system',
    visibleTo: ['student-family'],
    titleByRole: { 'student-family': '机械波错题订正被退回' },
    subtitleByRole: { 'student-family': '作业 · 待订正' },
    avatarByRole: { 'student-family': '订' },
    updatedAt: '2026-08-08T10:40:00+08:00',
    unreadByRole: { 'student-family': 1 },
    entries: [],
    notice: {
      tag: '作业退回',
      body: ['王老师退回了机械波错题订正。', '请补全受力分析并订正第 3、5 题，然后再次提交。'],
      actionLabel: '去订正',
      actionFeedback: '',
      actionTarget: { kind: 'homework', homeworkId: 'homework-correction', view: 'correction' },
      metadata: [{ label: '老师', value: '王老师' }, { label: '收到时间', value: '今天 10:40' }],
    },
  },
  {
    id: 'system-student-graded',
    category: 'system',
    visibleTo: ['student-family'],
    titleByRole: { 'student-family': '实验报告已批改：92 分' },
    subtitleByRole: { 'student-family': '作业结果' },
    avatarByRole: { 'student-family': '92' },
    updatedAt: '2026-08-07T10:00:00+08:00',
    unreadByRole: { 'student-family': 0 },
    entries: [],
    notice: {
      tag: '批改结果',
      body: ['实验报告：碰撞模型已完成批改，得分 92。', '老师反馈：结论清楚，误差分析还可以补充测量工具的影响。'],
      actionLabel: '查看反馈',
      actionFeedback: '',
      actionTarget: { kind: 'homework', homeworkId: 'homework-result', view: 'result' },
      metadata: [{ label: '老师', value: '王老师' }, { label: '批改时间', value: '昨天 10:00' }],
    },
  },
  {
    id: 'system-student-class-invite',
    category: 'system',
    visibleTo: ['student-family'],
    titleByRole: { 'student-family': '王老师邀请你加入班级' },
    subtitleByRole: { 'student-family': '班级邀请' },
    avatarByRole: { 'student-family': '邀' },
    updatedAt: '2026-08-08T11:20:00+08:00',
    unreadByRole: { 'student-family': 1 },
    entries: [],
    notice: {
      tag: '班级邀请',
      body: ['王老师邀请你加入「高二物理 3 班」。', '本条为预置邀请通知，只展示邀请信息，不提供加入操作。'],
      actionLabel: '查看邀请说明',
      actionFeedback: '邀请详情已完整展示；移动端没有加入动作或班级深链。',
      metadata: [{ label: '邀请人', value: '王老师' }, { label: '接收时间', value: '今天 11:20' }],
    },
  },
  ...projectMessagePublicationThreads(OPEN_COURSE_RECORDS, MESSAGE_PUBLICATION_SNAPSHOT, MESSAGE_NOW),
  ...INSIGHT_DIRECT_THREADS,
];

export const MESSAGE_CONTACTS: ReadonlyArray<MessageContact> = [
  ...CLASS_AGENT_DEFINITIONS.flatMap((agent) => (['teacher', 'student-family'] as const).map((role) => ({
    id: `contact-${agent.id}-${role}`,
    name: agent.name,
    relationship: `班级 Agent · ${agent.classLabel} · ${agent.capabilitySummary}`,
    visibleTo: [role],
    targetThreadId: getAgentDirectThreadId(agent.id, role),
    agentId: agent.id,
  }))),
  { id: 'contact-li', name: '李明', relationship: '学生 · 高二物理 3 班', visibleTo: ['teacher'], targetThreadId: 'direct-wang-li' },
  { id: 'contact-zhang', name: '张老师', relationship: '联系人 · 物理教研组', visibleTo: ['teacher'], targetThreadId: 'direct-teacher-zhang' },
  { id: 'contact-wang', name: '王老师', relationship: '物理老师', visibleTo: ['student-family'], targetThreadId: 'direct-wang-li' },
  { id: 'contact-chen', name: '陈老师', relationship: '英语老师', visibleTo: ['student-family'], targetThreadId: 'direct-student-chen' },
  { id: 'contact-zhou', name: '周然', relationship: '联系人', visibleTo: ['student-family'], targetThreadId: 'direct-student-zhou' },
  ...INSIGHT_PEERS.map(([peerId, name]) => ({ id: `contact-${peerId}`, name, relationship: '学生 · 教学洞察', visibleTo: ['teacher'] as const, targetThreadId: `direct-insight-${peerId}` })),
];
