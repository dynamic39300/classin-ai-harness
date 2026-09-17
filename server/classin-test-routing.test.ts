import { describe, expect, it } from 'vitest';
import { routeQuestion } from './classin-test-middleware';

describe('ClassIn Copilot question routing', () => {
  it('routes a named student weekly-learning question without requiring 同学 or 学生', () => {
    expect(routeQuestion(
      '请总结小石头本周的学习情况，注明覆盖范围，不评价进步或推断错因。',
      ['苟富贵', '小石头', '悦子'],
    )).toEqual({ questionId: 'D1', tools: ['read_student_learning'] });
  });

  it('keeps a class-wide weekly summary on the class learning route', () => {
    expect(routeQuestion(
      '请总结我们班本周的学习情况，注明覆盖范围。',
      ['苟富贵', '小石头', '悦子'],
    )).toEqual({ questionId: 'E4', tools: ['read_weekly_learning'] });
  });
});
