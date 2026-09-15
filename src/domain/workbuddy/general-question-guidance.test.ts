import { describe, it, expect } from 'vitest';
import { activateGeneralQuestion, GENERAL_QUESTION_GROUPS, GENERAL_QUESTION_TEXT, projectGeneralQuestions } from './general-question-guidance';
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
});
