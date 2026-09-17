// Engineering suggestions are separate from the model plan and factual context.
export const REVIEW_VERSION = 'answer-quality-v2';
export const SUGGESTIONS_VERSION = 'business-suggestions-v3';
export const DIMENSIONS = { match: '是否答到点上', relevance: '内容是否相关', quality: '回答是否好用' };
const inventory = 'IM-COPILOT-REAL-API-INVENTORY-REVIEW-2026-09-15.md';
const candidates = [
  { id: 'next-lesson-students', questions: ['A2'], title: '下节课安排了多少学生',
    endpoint: '/lms/app/activity/class/get', toolId: 'read_activity',
    information: ['这节课的学生人数：补充参与本课的规模；不是实时到课人数。'],
    fields: 'studentTotal：课节学生人数。应以已确定的下一课 activityId 读取。',
    benefit: '仅在下一课已定位、现有记录确实没有学生人数时，可补上课程规模。课名和时间不重复取数。',
    availability: '课堂详情已有实测字段；A2 自动将下一课绑定到详情工具尚未实现，需要工程侧补齐绑定并核验。', source: inventory },
  { id: 'homework-roster', questions: ['C2'], title: '谁没交、谁还没批',
    endpoint: '/lms/app/activity/homework/students', toolId: 'read_homework_students',
    information: ['学生对应的提交、批阅状态：分别列出未交、待批和已批名单。', '是否为草稿：避免把没正式交出的草稿算作已提交。'],
    fields: 'studentUid：学生标识；stStatus：提交/批阅状态；isDraft：是否草稿。分配人数来自作业详情。',
    benefit: '当回答只有作业介绍、缺少名单或数量时，这些信息直接帮助回答“谁没交、批完了吗”。',
    availability: '审阅台已有只读工具，真实名单与状态读取已验证；姓名是否可得以响应为准。', source: inventory },
  { id: 'student-submission', questions: ['C2'], title: '学生交了什么、老师写了什么评语',
    endpoint: '/lms/app/activity/homework/student/detail',
    information: ['正式提交的文字：了解学生实际交了哪些内容。', '教师批阅文字与评语：了解反馈内容。', '图片、音频、视频和文档附件：知道有哪类材料；附件存在不等于已经读懂内容。'],
    fields: 'content：提交文字；th_content / comment：批阅文字与评语；image / audio / video / docs：附件。',
    benefit: '适合继续追问“批改反馈是什么”。仅判断是否交齐、是否批完时，名单状态可能已足够，不必读取个人作答。',
    availability: '既有测试接入已实测，独立审阅台尚未封装。只读已正式提交、属于本次作业的学生记录；图片答案理解另需验证。', source: 'FEATURE-SPEC.md · CI-008c；server/classin-test-submissions.ts' },
  { id: 'class-notes', questions: ['E2'], title: '老师记录的课堂重点',
    endpoint: '/api/classin.api.php?action=getClassNotes', toolId: 'read_teacher_notes',
    information: ['教师本人笔记的正文：作为课堂知识点和提醒的直接材料。', '笔记总数与返回条目：检查是否漏读笔记。'],
    fields: 'noteList：笔记条目；totalNum：总条数。各条正文以实际响应结构为准。',
    benefit: '当回答只列时长和人数时，笔记可能补上“课堂讲了什么”。',
    availability: '审阅台已接入教师本人笔记；私人学生笔记不在范围，记录时间不等于讲解时间轴。', source: inventory },
  { id: 'class-ai', questions: ['E2'], title: 'AI 整理的课堂内容线索',
    endpoint: '/course-ai-assistant/admin/ai-teaching-analysis/report', toolId: 'read_ai_analysis',
    information: ['AI 报告正文：可能提供知识点、内容摘要等回顾线索。', '报告关联课节：先核对是否属于正在回顾的这节课。'],
    fields: 'reportContent：AI 生成正文；若返回 classInfo.classId 则核对课节。',
    benefit: '笔记较少时可作辅助，但必须与本节课和正式记录交叉核对。',
    availability: '审阅台已有工具；本轮曾发现 AI 正文课题与所选数学课不符，不能直接当作事实。', source: 'review-lab/ACCEPTANCE-2026-09-16.md' },
  { id: 'class-transcript', questions: ['E2'], title: '课堂实际讲解的转写原文',
    endpoint: '/course-ai-assistant/app/file/richVideoSummary', toolId: 'read_class_transcript',
    information: ['逐段讲解文字：补充知识点、方法和练习的实际内容。', '每段在视频中的起止时间：便于回看核对；多文件分别记录。'],
    fields: 'content.children[].desc：原始机器转写；metadata.times：视频内起止时间；FileId来自getLessonRecordInfo回放文件列表。',
    benefit: '笔记和AI摘要没有讲清楚时，原始讲解提供更直接的内容依据；不重复读取已取得的转写。',
    availability: '第一、二讲已实测正文，独立审阅台已加入可选工具。转写可能误识别；第一讲已发现另一个文件主题不符，必须逐文件核对。', source: 'review-lab/ASR-READ-VERIFICATION-2026-09-16.md' },
  { id: 'chat-schedule', questions: ['F1'], title: '群里提到的课与正式课表是否一致',
    endpoint: '/lms/app/course/unitActivityList', toolId: 'list_course_activities',
    information: ['课程活动名称、排定时间和发布状态：核对聊天中提到的课程安排。'],
    fields: 'activities 中的 name / startTime / endTime / publishFlag。',
    benefit: '只有已读聊天正文确实提到上课安排时才值得补充。课表不能代替聊天原文，也不能据此猜测群里讨论了什么。',
    availability: '审阅台可实时读取课表；当前 IM 捕获回放模式不补调实时接口，需另建具有相同时间范围的受控测试。', source: inventory },
];

// Only inspect the selected next lesson, never aggregate counts from other lessons.
function nextLesson(run) {
  const e = run.context?.evidence?.find(e => e.toolId === 'list_course_activities');
  return { evidence: e, next: e?.data?.next };
}
const validCount = n => typeof n === 'number' && Number.isInteger(n) && n >= 0;
export function availableInformation(run) {
  const {evidence, next} = nextLesson(run);
  if (run.questionId !== 'A2' || !next) return [];
  const info = [];
  const common = { evidenceId: evidence.id, sourceRefs: evidence.sourceRefs || [], endpoint: '/lms/app/course/unitActivityList' };
  if (next.name && next.startTime != null && next.endTime != null) info.push({
    ...common, id: 'next-schedule', title: '下节课的课名与起止时间已取得',
    text: `${next.name}；${next.startsAtLocal || '开始时间已取得'} — ${next.endsAtLocal || '结束时间已取得'}。无需换一个接口重复读取。`,
    fields: 'Context → next.name / next.startTime / next.endTime；原始活动列表保留这些字段。',
  });
  const count = next.status?.studentTotal;
  if (validCount(count)) info.push({ ...common, id: 'next-student-count', title: `下节课学生人数：${count} 人`,
    text: '本次接口已返回，也已提供给回答模型。可以在回答里补充，无需新增接口调用；这个人数不代表实际到课人数。',
    fields: 'Context → next.status.studentTotal；原始活动列表 → 目标课节.status.studentTotal。',
  });
  return info;
}

export function reviewOptions(run) {
  const completed = !!run.executedAt && !['executing', 'planning'].includes(run.status);
  const items = completed ? candidates.filter(c => c.questions.includes(run.questionId)).filter(c => {
    if (c.id === 'next-lesson-students') {const {next} = nextLesson(run); return !!next && !validCount(next.status?.studentTotal);}
    if (c.id === 'chat-schedule') {const e = run.context?.evidence?.find(e => e.toolId === 'read_im_history'); return (e?.data?.contentCoverage?.readableCount || 0) > 0 && e.data.messages.some(m => typeof m.content === 'string' && /上课|课表|课程安排/.test(m.content));}
    return true;
  }).filter(c =>
    !run.trace.some(t => t.path === c.endpoint)
    && !run.results.some(r => r.toolId === c.toolId && (r.evidence || ['failed', 'partial', 'success', 'replayed'].includes(r.status)))
  ).map(c => {
    const planned = c.toolId && run.plan?.some(p => p.toolId === c.toolId);
    return { ...c, reason: !c.toolId ? '独立审阅台尚未把此接口加入模型可选工具。'
      : planned ? '模型曾提出相关工具，但记录未显示本接口已执行；需先检查拒绝或中断原因。'
        : '本次模型没有选择对应工具，逐条请求记录中也没有这个接口。',
      status: 'not-called', sourceKind: '工程盘点建议，并非本次模型输出或真实返回' };
  }) : [];
  return { version: SUGGESTIONS_VERSION, ready: completed, items, available: completed ? availableInformation(run) : [] };
}

export function validateReview(run, input) {
  const answer = run.answers.at(-1);
  if (!answer?.text || answer.status !== 'answered') throw new Error('请先取得实际回答，再保存回答评价。');
  if (input.version !== REVIEW_VERSION || input.answerId !== answer.id || input.snapshotHash !== run.snapshotHash)
    throw new Error('回答或上下文版本已变化，请刷新后评价当前回答；原意见不会覆盖新版本。');
  if (typeof input.note !== 'string' || input.note.length > 10000) throw new Error('备注最多 10000 字。');
  const verdicts = {};
  for (const key of Object.keys(DIMENSIONS)) {
    const value = input.verdicts?.[key] ?? '待评价';
    if (!['待评价', '满意', '基本满意', '不满意', '无法判断'].includes(value)) throw new Error('回答评价无效。');
    verdicts[key] = value;
  }
  const options = reviewOptions(run);
  if (input.suggestionsVersion !== options.version) throw new Error('补充信息说明已更新，请刷新后保存。');
  if (!Array.isArray(input.suggestions) || input.suggestions.length > options.items.length) throw new Error('补充建议无效。');
  const seen = new Set();
  const suggestions = input.suggestions.map(item => {
    const candidate = options.items.find(c => c.id === item.id);
    if (!candidate || seen.has(item.id) || !['待判断', '建议补充', '暂不需要', '需要讨论'].includes(item.decision)
      || typeof item.note !== 'string' || item.note.length > 2000) throw new Error('补充建议无效。');
    seen.add(item.id);
    return { id: item.id, decision: item.decision, note: item.note, candidate };
  });
  return { version: REVIEW_VERSION, answerId: answer.id, snapshotHash: run.snapshotHash,
    verdicts, note: input.note, suggestionsVersion: options.version, suggestions };
}

export function reviewMarkdown(v) {
  const labels = v.version === REVIEW_VERSION ? DIMENSIONS : { routing: '工具选择', data: '业务数据', context: '上下文', answer: '回答' };
  return `${v.at} · ${v.version === REVIEW_VERSION ? '回答质量反馈' : '旧版技术审阅（历史）'} · 回答版本 ${v.answerId || '无'}\n\n`
    + Object.entries(v.verdicts || {}).map(([k, value]) => `- ${labels[k] || k}：${value}`).join('\n')
    + `\n\n${v.note || '未填写备注'}${v.anchor ? '\n历史定位：' + v.anchor : ''}\n\n`
    + (v.suggestions || []).map(s => `- ${s.candidate.title}：${s.decision}；${s.note || '无附注'}\n  - 可能帮助：${s.candidate.benefit}\n  - 预计信息：${s.candidate.information.join('；')}\n  - 接口：${s.candidate.endpoint}\n  - 可用性：${s.candidate.availability}`).join('\n');
}
