import { describe, it, expect } from 'vitest';
import { activateGeneralQuestion, buildGeneralQuestionRequest, GENERAL_QUESTION_GROUPS, GENERAL_QUESTION_TEXT, projectGeneralQuestions } from './general-question-guidance';
const question = { id: 'A2' as const, text: GENERAL_QUESTION_TEXT.A2, contextRefs: [] };
const empty = { text: '', hasAttachments: false, hasReference: false, busy: false, reviewing: false, sending: false, canSend: true };
describe('general question guidance', () => {
  it('keeps exactly the approved 21 IDs and does not show unsupported questions', () => {
    expect(GENERAL_QUESTION_GROUPS.flatMap(group => [...group.ids])).toHaveLength(21);
    expect(projectGeneralQuestions(undefined, true).groups).toEqual([]);
    const result = projectGeneralQuestions({ questions: [question], initialQuestionIds: ['A2', 'B3', 'A2'] }, true);
    expect(result.initial).toEqual([question]);
    expect(result.groups.map(group => group.questions.map(q => q.id))).toEqual([['A2'], ['E5']]);
  });
  it('sends only on the empty idle path and preserves existing text and attachments', () => {
    expect(activateGeneralQuestion(question, empty).kind).toBe('submit');
    for (const guard of [{ text: '老师自己的话' }, { hasAttachments: true }, { hasReference: true }, { busy: true }, { reviewing: true }, { canSend: false }]) {
      const result = activateGeneralQuestion(question, { ...empty, ...guard });
      expect(result.kind).toBe('append');
      if (result.kind === 'append') expect(result.text).toBe(guard.text ? `${guard.text}\n${question.text}` : question.text);
    }
    expect(activateGeneralQuestion(question, { ...empty, sending: true }).kind).toBe('blocked');
    expect(activateGeneralQuestion(question, { ...empty, text: 'x'.repeat(3999) }).kind).toBe('blocked');
  });
  it('adds strict evidence rules for attendance and recording questions', () => {
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.B2)).toContain('请假未知');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.B2)).toContain('不要使用“连续缺勤”');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.B3)).toContain('不得把开始时间称为发布时间');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.B3)).toContain('不估算还剩多少天');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.C5)).toContain('未完全正确”只能等于错误加部分正确');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.E3)).toContain('实际正文');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.E5)).toContain('当前Session已经确认的内容');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.D1)).toContain('受限活动聚合而非正式学情报告');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.E4)).toContain('活动覆盖率');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.B3)).toContain('必须使用 GFM Markdown 表格');
    expect(buildGeneralQuestionRequest(GENERAL_QUESTION_TEXT.B3)).toContain('先用“项目｜内容”表列元信息');
  });
});
