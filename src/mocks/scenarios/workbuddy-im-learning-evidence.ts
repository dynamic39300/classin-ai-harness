import type { LearningContextCatalog, LearningContextSelection } from '@contracts/workbuddy/business-context';

export const WORKBUDDY_IM_LEARNING_CATALOG: LearningContextCatalog = Object.freeze({
  students: Object.freeze([
    Object.freeze({ ref: 'student-001', label: '李明', description: '高二物理 3 班 · 当前私聊可达', directThreadRef: 'direct-wang-li' }),
    Object.freeze({ ref: 'student-002', label: '王小明', description: '高二物理 3 班 · 作业待提交' }),
    Object.freeze({ ref: 'student-003', label: '张然', description: '高二物理 3 班 · 订正待完善' }),
    Object.freeze({ ref: 'all-pending', label: '本班待跟进学生', description: '李明、王小明、张然等 6 人', isAggregate: true }),
  ]),
  lessons: Object.freeze([
    Object.freeze({ ref: 'lesson-momentum-0808', label: '8月8日 · 动量守恒模型', description: '已结束 · 课堂互动与随堂回答可用', studentRefs: ['student-001'] }),
    Object.freeze({ ref: 'lesson-wave-0807', label: '8月7日 · 机械波基础', description: '已结束 · 课堂报告可用', studentRefs: ['student-001'] }),
  ]),
  assignments: Object.freeze([
    Object.freeze({ ref: 'homework-momentum-a', label: '动量守恒作业 A 组', description: '8月10日 18:00 截止 · 6 人待提交', studentRefs: ['all-pending', 'student-001', 'student-002', 'student-003'], reminderReasonRefs: ['homework-submission'] }),
    Object.freeze({ ref: 'homework-correction', label: '机械波错题订正', description: '8月12日 18:00 截止 · 李明待完善', studentRefs: ['student-001'], reminderReasonRefs: ['homework-correction'] }),
  ]),
  wrongQuestions: Object.freeze([
    Object.freeze({ ref: 'wrong-momentum-5', label: '动量守恒练习单第 5 题', description: '李明 · 碰后速度正负号判断', studentRefs: ['student-001'] }),
    Object.freeze({ ref: 'wrong-wave-3', label: '机械波订正第 3 题', description: '李明 · 波速、频率与波长关系', studentRefs: ['student-001'] }),
  ]),
  periods: Object.freeze([
    Object.freeze({ ref: 'period-this-week', label: '本周', description: '8月3日—8月9日' }),
    Object.freeze({ ref: 'period-current-unit', label: '动量守恒单元', description: '本单元课堂、作业与互动' }),
  ]),
  reminderReasons: Object.freeze([
    Object.freeze({ ref: 'homework-submission', label: '作业提交', description: '提醒截止时间与待完成任务' }),
    Object.freeze({ ref: 'homework-correction', label: '作业订正', description: '提醒按反馈补充订正' }),
    Object.freeze({ ref: 'attendance', label: '出勤与补课', description: '提醒缺席内容和补课安排' }),
    Object.freeze({ ref: 'schedule-change', label: '课程安排变更', description: '提醒时间、地点与准备事项' }),
  ]),
  version: 'learning-scenario-2026-08-09-v1',
  truthLabel: 'fixed-demo',
});

/**
 * Repository-safe projection of one customer pattern queried through DW Hunter on
 * 2026-09-08. Names and identifiers are replaced, long messages are reduced to
 * business facts, and no row-level chat text is retained in the repository.
 */
export const DW_DERIVED_IM_LEARNING_CATALOG: LearningContextCatalog = Object.freeze({
  students: Object.freeze([
    Object.freeze({ ref: 'dw-student-001', label: '林悦', description: '表达与思辨体验班 · 当前私聊可达', directThreadRef: 'direct-dw-lin' }),
    Object.freeze({ ref: 'dw-all-follow-up', label: '本班待确认学生', description: '近期存在迟到、请假或未回执沟通', isAggregate: true }),
  ]),
  lessons: Object.freeze([
    Object.freeze({ ref: 'dw-lesson-problem-solution', label: '8月15日 · Problem–Solution 表达', description: '个别学习反馈可用', studentRefs: ['dw-student-001'] }),
    Object.freeze({ ref: 'dw-lesson-hero', label: '9月 · 英雄与成败观', description: '群课堂回顾可用 · 个人发言未留存', studentRefs: ['dw-student-001'] }),
  ]),
  assignments: Object.freeze([
    Object.freeze({ ref: 'dw-task-vocabulary', label: '重点词汇复习与造句', description: '下次课前确认 · 数仓未见学生回执', studentRefs: ['dw-student-001'], reminderReasonRefs: ['homework-submission', 'homework-correction'] }),
    Object.freeze({ ref: 'dw-task-class-confirmation', label: '课前到课确认', description: '开课前确认到课或请假状态', studentRefs: ['dw-all-follow-up', 'dw-student-001'], reminderReasonRefs: ['homework-submission'] }),
  ]),
  wrongQuestions: Object.freeze([
    Object.freeze({ ref: 'dw-practice-problem-solution', label: 'Problem–Solution 造句练习', description: '林悦 · 新词独立造句仍需练习', studentRefs: ['dw-student-001'] }),
    Object.freeze({ ref: 'dw-practice-hero-reason', label: '英雄判断理由补全', description: '群课堂关注点 · 未留存个人错答', studentRefs: ['dw-student-001'] }),
  ]),
  periods: Object.freeze([
    Object.freeze({ ref: 'dw-period-30-days', label: '近 30 天', description: '8月9日—9月7日 · 个别反馈与群互动' }),
    Object.freeze({ ref: 'dw-period-expression', label: '表达与思辨主题', description: '故事结构、观点理由与词汇运用' }),
  ]),
  reminderReasons: WORKBUDDY_IM_LEARNING_CATALOG.reminderReasons,
  version: 'dw-derived-im-2026-09-07-v1',
  truthLabel: 'read-only-business-data',
});

function dwDerivedLearningEvidence(selection: LearningContextSelection): readonly Readonly<{ label: string; value: string; sensitivity: 'standard' | 'student-personal' }>[] {
  const common = [
    { label: '课程', value: '少儿表达与思辨 · 去标识化客户样本', sensitivity: 'standard' as const },
    { label: '数据口径', value: 'DW Hunter 只读查询的去标识化业务事实：群聊窗口为9月1日至9月7日，联系人会话窗口为8月9日至9月7日；消息时效为T-1。', sensitivity: 'standard' as const },
    { label: '教师观察', value: '先肯定已有表现，只陈述可核验证据；缺少学生回执时用“待确认”，不能推断未完成。', sensitivity: 'student-personal' as const },
  ];
  if (selection.capability === 'personalized-reminder') {
    const fact = selection.reminderReasonRef === 'attendance'
      ? '群聊近7天共96条消息、14位发送者，出现多次开课召回、迟到与请假沟通；林悦个人到课状态未在可见记录中确认，应先询问而非判定缺席。'
      : selection.reminderReasonRef === 'schedule-change'
        ? '群内曾出现19:00开课和可能迟到的沟通；当前课次时间仍需教师确认后再发送。'
        : '联系人会话中教师已发出词汇复习与造句建议，但数仓当前存储方向只保留单侧发送记录，未发现学生回执；只能提醒确认，不能判定未完成。';
    return [...common,
      { label: '沟通事实', value: fact, sensitivity: 'student-personal' },
      { label: '沟通要求', value: '说明依据和需要确认的下一步，不公开个人反馈，不使用责备语气。', sensitivity: 'standard' },
    ];
  }
  if (selection.capability === 'class-recap') return selection.lessonRef === 'dw-lesson-hero' ? [...common,
    { label: '课堂要点', value: '群课堂围绕英雄的定义、胜负与品格展开，强调不能只凭输赢判断，需同时考虑行为是否正义以及是否有担当。', sensitivity: 'standard' },
    { label: '个人证据边界', value: 'IM 中没有留存林悦在该课次的个人发言或教师评价；回顾应邀请她补充自己的判断理由，不得虚构表现。', sensitivity: 'student-personal' },
    { label: '下一步', value: '选择一个“获胜但手段不正当”的例子，用“我的判断—两个理由—反例回应”完成三句话表达。', sensitivity: 'student-personal' },
  ] : [...common,
    { label: '课堂要点', value: '学习用 Problem–Solution 结构组织表达，并结合故事情节识别问题、解决办法与结果。', sensitivity: 'standard' },
    { label: '个别反馈', value: '林悦对 Problem–Solution 概念掌握较好，能够跟随故事结构；新词需要规律复习，并通过独立造句巩固。', sensitivity: 'student-personal' },
    { label: '下一步', value: '从本课新词中选两个词，各写一句，并用 because 或 so 说明问题与解决办法的联系。', sensitivity: 'student-personal' },
  ];
  if (selection.capability === 'wrong-question-practice') return selection.wrongQuestionRef === 'dw-practice-hero-reason' ? [...common,
    { label: '练习任务', value: '判断“一个人靠不正当手段获胜，能否被称为英雄”，至少给出两个评价标准。', sensitivity: 'student-personal' },
    { label: '证据边界', value: 'IM 只保留群课堂主题，没有林悦的个人作答；不得描述不存在的错误步骤。', sensitivity: 'student-personal' },
    { label: '讲解重点', value: '先给出判断，再分别从行为正当性、对他人的影响和是否承担责任组织理由。', sensitivity: 'standard' },
  ] : [...common,
    { label: '练习任务', value: '使用本课两个新词，各写一个 Problem–Solution 结构的英文句子。', sensitivity: 'student-personal' },
    { label: '现有表现', value: '个别反馈确认林悦理解 Problem–Solution 概念，但需要持续复习新词并练习独立造句。', sensitivity: 'student-personal' },
    { label: '证据边界', value: '当前 IM 中没有具体错句或评分，不能声称她在哪个单词或语法步骤答错。', sensitivity: 'student-personal' },
    { label: '讲解重点', value: '先确定 problem，再选择表达 solution 的动作，最后检查新词是否放在合适语境。', sensitivity: 'standard' },
  ];
  return [...common,
    { label: '阶段进展', value: '近30天个别反馈多次肯定故事要素定位、情节结构理解和阅读理解；Problem–Solution 概念已经建立。', sensitivity: 'student-personal' },
    { label: '当前关注', value: '教师明确建议规律复习新词并增加独立造句；部分长篇反馈只有教师单侧记录，尚无学生回执可验证。', sensitivity: 'student-personal' },
    { label: '下一步', value: '每次课后选两个新词造句，并用“问题—办法—结果”复述一个故事片段；下次课前带一例与教师核对。', sensitivity: 'student-personal' },
  ];
}

export function learningEvidence(selection: LearningContextSelection): readonly Readonly<{ label: string; value: string; sensitivity: 'standard' | 'student-personal' }>[] {
  if (selection.studentRef.startsWith('dw-')) return dwDerivedLearningEvidence(selection);
  const common = [
    { label: '课程', value: '高二物理 · 动量守恒与机械波', sensitivity: 'standard' as const },
    { label: '教师观察', value: '先肯定已完成的步骤，再用一个可执行动作收束沟通。', sensitivity: 'student-personal' as const },
  ];
  if (selection.capability === 'personalized-reminder') {
    const reminderFact = selection.reminderReasonRef === 'attendance'
      ? '李明缺席了8月7日机械波基础课堂；补课安排为8月10日 16:30，需提前准备错题订正。'
      : selection.reminderReasonRef === 'schedule-change'
        ? '8月10日的物理课从14:30调整到16:30，教室改为B203，需携带实验报告。'
        : selection.assignmentRef === 'homework-correction'
          ? '李明的机械波错题订正已提交后退回，需补充介质不变时三个量的变化关系；截止时间8月12日 18:00。'
          : '本班有6人尚未提交动量守恒作业A组；截止时间8月10日 18:00。';
    return [...common,
    { label: '任务状态', value: reminderFact, sensitivity: 'student-personal' },
    { label: '沟通要求', value: '说明原因、明确下一步和时间，不使用责备语气。', sensitivity: 'standard' },
  ];
  }
  if (selection.capability === 'class-recap') return selection.lessonRef === 'lesson-wave-0807' ? [...common,
    { label: '课堂目标', value: '理解同一介质中波速稳定，能用v=fλ判断频率与波长的变化关系。', sensitivity: 'standard' },
    { label: '课堂参与', value: '李明能写出v=fλ，但解释介质不变时三个量关系时遗漏波速不变前提。', sensitivity: 'student-personal' },
    { label: '个人关注', value: '先写出“介质不变→波速不变”，再根据频率变化判断波长。', sensitivity: 'student-personal' },
  ] : [...common,
    { label: '课堂目标', value: '能先约定正方向，再用动量守恒方程判断碰后速度方向。', sensitivity: 'standard' },
    { label: '课堂参与', value: '李明能写出守恒方程，但在碰后速度符号处两次修改答案。', sensitivity: 'student-personal' },
    { label: '个人关注', value: '列式前先画方向箭头，并在代入前标出每个速度的正负。', sensitivity: 'student-personal' },
  ];
  if (selection.capability === 'wrong-question-practice') return selection.wrongQuestionRef === 'wrong-wave-3' ? [...common,
    { label: '原题', value: '同一绳上传播的机械波频率由5 Hz增至10 Hz，原波长2 m，求变化后的波速与波长。', sensitivity: 'student-personal' },
    { label: '标准答案', value: '介质不变，波速v=10 m/s保持不变；新波长λ=v/f=1 m。', sensitivity: 'student-personal' },
    { label: '学生作答', value: '认为频率加倍后波速也加倍为20 m/s，波长保持2 m；遗漏波速由介质决定。', sensitivity: 'student-personal' },
    { label: '知识点', value: '机械波波速的决定因素与v=fλ的使用条件。', sensitivity: 'standard' },
  ] : [...common,
    { label: '原题', value: '1 kg 小车以 4 m/s 向右与 1 kg 静止小车碰撞，碰后第一辆以 1 m/s 向左，求第二辆速度。', sensitivity: 'student-personal' },
    { label: '标准答案', value: '取向右为正：1×4+0=1×(-1)+1×v，v=5 m/s，方向向右。', sensitivity: 'student-personal' },
    { label: '学生作答', value: '列式为 4=1+v，得到 v=3 m/s；未把向左速度记为负值。', sensitivity: 'student-personal' },
    { label: '知识点', value: '一维碰撞中的正方向约定与速度代数量。', sensitivity: 'standard' },
  ];
  return selection.periodRef === 'period-current-unit' ? [...common,
    { label: '课堂表现', value: '本单元能识别动量守恒条件并正确列出守恒式，碰后方向判断从多次修改进步为提示后可自查。', sensitivity: 'student-personal' },
    { label: '作业表现', value: '碰撞模型总结92分；单元任务完成4/5；错题再练第一次仍遗漏速度符号。', sensitivity: 'student-personal' },
    { label: '互动记录', value: '三次主动提问都围绕方向与符号，过程图提示后能够独立完成订正。', sensitivity: 'student-personal' },
  ] : [...common,
    { label: '课堂表现', value: '能识别动量守恒条件，方向判断仍不稳定；主动在课后提问。', sensitivity: 'student-personal' },
    { label: '作业表现', value: '碰撞模型总结 92 分；机械波订正被退回一次；本周任务按时提交 3/4。', sensitivity: 'student-personal' },
    { label: '互动记录', value: '对图示和分步反馈响应较好，能在提示后自行修正过程图。', sensitivity: 'student-personal' },
  ];
}
