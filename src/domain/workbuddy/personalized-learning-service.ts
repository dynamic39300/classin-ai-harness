import type { BusinessContextSnapshot, LearningCapability, LearningContextCatalog, LearningContextOption, LearningContextSelection, PersonalizedLearningArtifact } from '@contracts/workbuddy/business-context';

export const LEARNING_CAPABILITIES: readonly Readonly<{ id: LearningCapability; label: string; description: string }>[] = Object.freeze([
  Object.freeze({ id: 'personalized-reminder', label: '个性化提醒', description: '按课程、出勤或作业状态生成沟通话术' }),
  Object.freeze({ id: 'class-recap', label: '个性化课堂回顾', description: '把课堂要点转成学生个人回顾' }),
  Object.freeze({ id: 'wrong-question-practice', label: '错题解析与再练', description: '解释错误步骤并生成一道相关练习' }),
  Object.freeze({ id: 'learning-summary', label: '个人学情总结', description: '整理阶段进展、困难和下一步' }),
]);

export function validateLearningSelection(selection: LearningContextSelection): string | null {
  if (!selection.studentRef) return '请选择接收学生。';
  if (selection.capability === 'personalized-reminder' && !selection.reminderReasonRef) return '请选择提醒原因。';
  if (selection.capability === 'personalized-reminder' && selection.reminderReasonRef?.startsWith('homework-') && !selection.assignmentRef) return '请选择相关任务。';
  if (selection.capability === 'class-recap' && !selection.lessonRef) return '请选择课次。';
  if (selection.capability === 'wrong-question-practice' && !selection.wrongQuestionRef) return '请选择错题。';
  if (selection.capability === 'learning-summary' && !selection.periodRef) return '请选择总结周期。';
  return null;
}

export function validateLearningSelectionAgainstCatalog(selection: LearningContextSelection, catalog: LearningContextCatalog): string | null {
  const required = validateLearningSelection(selection);
  if (required) return required;
  if (!catalog.students.some(({ ref }) => ref === selection.studentRef)) return '所选学生已不在当前会话权限范围内。';
  const selected: LearningContextOption | undefined = selection.capability === 'personalized-reminder'
    ? (selection.assignmentRef ? catalog.assignments.find(({ ref }) => ref === selection.assignmentRef) : undefined)
    : selection.capability === 'class-recap'
      ? catalog.lessons.find(({ ref }) => ref === selection.lessonRef)
      : selection.capability === 'wrong-question-practice'
        ? catalog.wrongQuestions.find(({ ref }) => ref === selection.wrongQuestionRef)
        : catalog.periods.find(({ ref }) => ref === selection.periodRef);
  if (!(selection.capability === 'personalized-reminder' && !selection.assignmentRef) && !selected) return '所选业务对象已更新，请刷新后重新选择。';
  if (selected?.studentRefs?.length && !selected.studentRefs.includes(selection.studentRef)) return '所选业务对象与接收学生不匹配，请重新选择。';
  if (selection.capability === 'personalized-reminder' && !catalog.reminderReasons.some(({ ref }) => ref === selection.reminderReasonRef)) return '提醒原因已更新，请重新选择。';
  if (selection.capability === 'personalized-reminder' && selected?.reminderReasonRefs?.length && selection.reminderReasonRef && !selected.reminderReasonRefs.includes(selection.reminderReasonRef)) return '所选任务与提醒原因不匹配，请重新选择。';
  return null;
}

function optionLabel(catalog: LearningContextCatalog, group: keyof LearningContextCatalog, ref?: string): string {
  if (!ref) return '';
  const value = catalog[group];
  return Array.isArray(value) ? (value.find((option) => option.ref === ref)?.label ?? ref) : ref;
}

export function buildLearningTeacherRequest(selection: LearningContextSelection, catalog: LearningContextCatalog, extra = ''): string {
  const capability = LEARNING_CAPABILITIES.find(({ id }) => id === selection.capability)?.label ?? selection.capability;
  const student = optionLabel(catalog, 'students', selection.studentRef);
  const detail = selection.capability === 'personalized-reminder'
    ? [`提醒原因：${optionLabel(catalog, 'reminderReasons', selection.reminderReasonRef)}`, selection.assignmentRef ? `相关任务：${optionLabel(catalog, 'assignments', selection.assignmentRef)}` : ''].filter(Boolean).join('；')
    : selection.capability === 'class-recap'
      ? `课次：${optionLabel(catalog, 'lessons', selection.lessonRef)}`
      : selection.capability === 'wrong-question-practice'
        ? `错题：${optionLabel(catalog, 'wrongQuestions', selection.wrongQuestionRef)}`
        : `周期：${optionLabel(catalog, 'periods', selection.periodRef)}`;
  const format = selection.capability === 'wrong-question-practice'
    ? '请输出可直接发给学生的中文消息。若证据包含实际错答，依次包含：先肯定、错误发生在哪一步、分步解释、一道不重复原题的再练题（先不要给答案）、鼓励收束；若没有可核验错答，明确说明当前只掌握练习关注点，提供预防性讲解和一道再练，不得虚构学生错误。'
    : selection.capability === 'class-recap'
      ? '请输出可直接发给学生的中文消息，依次包含：课堂要点、这位学生的个人关注、一个具体下一步。'
      : selection.capability === 'learning-summary'
        ? '请输出可直接发给学生的中文消息，依次包含：阶段进展、当前困难、下一步建议；避免诊断性标签。'
        : '请输出可直接发送的简洁中文提醒，说明原因、明确下一步和时间，语气尊重且不责备。';
  return [`请执行“${capability}”。`, `接收对象：${student}。`, detail, format, extra.trim()].filter(Boolean).join('\n');
}

export function deliveryTarget(selection: LearningContextSelection, catalog: LearningContextCatalog, currentChannel: 'class' | 'direct') {
  if (currentChannel === 'direct') return Object.freeze({ kind: 'direct-composer' as const, threadRef: catalog.students.find(({ ref }) => ref === selection.studentRef)?.directThreadRef });
  if (selection.capability === 'personalized-reminder' && catalog.students.find(({ ref }) => ref === selection.studentRef)?.isAggregate) return Object.freeze({ kind: 'class-review' as const });
  return Object.freeze({ kind: 'direct-composer' as const, threadRef: catalog.students.find(({ ref }) => ref === selection.studentRef)?.directThreadRef });
}

export function createPersonalizedLearningArtifact(input: Readonly<{
  sessionRef: string;
  snapshot: BusinessContextSnapshot;
  selection: LearningContextSelection;
  catalog: LearningContextCatalog;
  body: string;
}>): PersonalizedLearningArtifact {
  const capability = LEARNING_CAPABILITIES.find(({ id }) => id === input.selection.capability);
  const recipient = input.catalog.students.find(({ ref }) => ref === input.selection.studentRef);
  const delivery = deliveryTarget(input.selection, input.catalog, input.snapshot.channel);
  return Object.freeze({
    id: `learning-artifact-${input.sessionRef}-${input.selection.capability}`,
    sessionRef: input.sessionRef,
    contextSnapshotRef: input.snapshot.id,
    capability: input.selection.capability,
    recipientRefs: Object.freeze([input.selection.studentRef]),
    recipientLabel: recipient?.label ?? '当前学生',
    title: capability?.label ?? '个性化沟通',
    body: input.body.trim(),
    evidenceLabels: Object.freeze(input.snapshot.items.filter(({ key }) => key.startsWith('learning-evidence-')).map(({ label }) => label)),
    delivery: delivery.kind,
    ...(delivery.kind === 'direct-composer' && delivery.threadRef ? { targetThreadRef: delivery.threadRef } : {}),
    version: 1,
  });
}

export function revisePersonalizedLearningArtifact(artifact: PersonalizedLearningArtifact, body: string): PersonalizedLearningArtifact {
  return Object.freeze({ ...artifact, body, version: artifact.version + 1 });
}
