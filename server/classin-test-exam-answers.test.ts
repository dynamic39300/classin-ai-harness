// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readExamAnswers } from './classin-test-exam-answers';
import { plain } from './classin-test-service';
import { TEST_SCOPE, type ClassInTransport } from './classin-test-transport';
const scope = { examId: '400', studentIds: ['8001'], topics: [{ topicId: 100, topicSource: 0, typeCode: 1 }] };
const row = { topicId: 100, topicSource: 0, topicType: 1, isAnswer: 2, answer: '', score: 0, judgeResult: 0 };
const response = (changes: Record<string, unknown> = {}) => ({ examId: 400, students: [{ studentId: 8001, studentExamId: 999, markingInfo: [{ ...row, ...changes }] }] });
const transport = (value: unknown) => vi.fn<ClassInTransport>(async () => value);
describe('verified teacher exam answer reads', () => {
  it('scopes the teacher call explicitly and does not turn unused slots into actual zero grades', async () => {
    const t = transport(response()); const result = (await readExamAnswers(t, scope, plain)).get('8001')!;
    expect(t).toHaveBeenCalledWith('/api/exam.api.php?action=getAnswerMarkResult', { UID: TEST_SCOPE.uid, examId: '400', studentIds: '[8001]', pageRole: 1 });
    expect(result.status).toBe('available'); expect(result.questions[0]).toMatchObject({ status: '未参与', answers: [], marking: null, score: null });
    expect(JSON.stringify(result)).not.toContain('studentExamId');
  });
  it('withholds stale answers for unattempted slots and distinguishes pending from a marked zero', async () => {
    for (const isAnswer of [0, 2]) {
      const result = (await readExamAnswers(transport(response({ isAnswer, answer: 'STALE-ANSWER', judgeResult: 2 })), scope, plain)).get('8001')!;
      expect(result.questions[0]).toMatchObject({ answers: [], score: null, marking: null });
    }
    for (const [judgeResult, score, expected] of [[0, 500, null], [2, 0, 0], [3, 750, 7.5]]) {
      const result = (await readExamAnswers(transport(response({ isAnswer: 1, answer: '<p>2</p>', judgeResult, score })), scope, plain)).get('8001')!;
      expect(result.questions[0]).toMatchObject({ answers: ['2'], score: expected });
    }
  });
  it('keeps media addresses and unknown structured answers out of projections', async () => {
    for (const answer of ['<img src="https://example.invalid/PRIVATE-TOKEN">', 'https://example.invalid/PRIVATE-TOKEN', [{ token: 'PRIVATE-TOKEN' }], '[{"token":"PRIVATE-TOKEN"}]']) {
      const result = (await readExamAnswers(transport(response({ isAnswer: 1, answer })), scope, plain)).get('8001')!;
      expect(JSON.stringify(result)).not.toContain('PRIVATE-TOKEN');
      expect(result.status === 'unavailable' || result.questions[0].hasMedia).toBe(true);
    }
  });
  it('rejects a different exam, student, topic, topic source or type', async () => {
    const foreignStudent = response(); foreignStudent.students[0].studentId = 8002;
    for (const value of [{ ...response(), examId: 401 }, foreignStudent, response({ topicId: 101 }), response({ topicSource: 1 }), response({ topicType: 5 })]) {
      await expect(readExamAnswers(transport(value), scope, plain)).rejects.toMatchObject({ code: 'forbidden' });
    }
  });
  it('makes incomplete, duplicated and unknown records unavailable instead of no-participation', async () => {
    const duplicated = response(); duplicated.students[0].markingInfo.push({ ...row });
    const duplicateStudents = response(); duplicateStudents.students.push(duplicateStudents.students[0]);
    for (const value of [{ ...response(), students: [] }, duplicated, duplicateStudents, response({ isAnswer: 9 }), response({ isAnswer: 1, judgeResult: 9 })]) {
      const result = (await readExamAnswers(transport(value), scope, plain)).get('8001')!;
      expect(result).toMatchObject({ status: 'unavailable', questions: [] });
    }
  });
  it('does not call without an assigned student and preserves transport failures as unavailable', async () => {
    const t = transport(response()); expect((await readExamAnswers(t, { ...scope, studentIds: [] }, plain)).size).toBe(0); expect(t).not.toHaveBeenCalled();
    t.mockRejectedValueOnce(new Error('PRIVATE-TOKEN'));
    expect((await readExamAnswers(t, scope, plain)).get('8001')).toMatchObject({ status: 'unavailable', questions: [] });
  });
});
