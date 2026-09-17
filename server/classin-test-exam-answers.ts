import type { ClassInExamAnswers } from '../src/contracts/classin-test/index.ts';
import { ClassInError, object, TEST_SCOPE, type ClassInTransport } from './classin-test-transport.ts';

type Scope = Readonly<{ examId: string; studentIds: readonly string[]; topics: readonly Readonly<{ topicId: number; topicSource: number; typeCode: number }>[] }>;
const unavailable = (): ClassInExamAnswers => ({ status: 'unavailable', message: '本次逐题作答未能完整核实，请点击活动重试；不能据此判断学生未参与或得分。', questions: [] });
const list = (value: unknown) => { if (!Array.isArray(value)) throw new ClassInError('schema_error', '逐题作答列表结构变化。'); return value.map(object); };
function sameSet(actual: string[], expected: readonly string[]) {
  if (actual.some((id) => !expected.includes(id))) throw new ClassInError('forbidden', '测验作答返回了授权范围外的对象。');
  if (actual.length !== expected.length || new Set(actual).size !== actual.length) throw new ClassInError('incomplete', '逐题作答缺失或重复。');
}
/** Only a verified activity, assignment roster and paper can supply this scope. */
export async function readExamAnswers(transport: ClassInTransport, scope: Scope, text: (value: unknown) => string): Promise<ReadonlyMap<string, ClassInExamAnswers>> {
  if (!scope.studentIds.length) return new Map();
  const results = new Map<string, ClassInExamAnswers>();
  try {
    const response = object(await transport('/api/exam.api.php?action=getAnswerMarkResult', {
      UID: TEST_SCOPE.uid, examId: scope.examId, studentIds: JSON.stringify(scope.studentIds.map(Number)), pageRole: 1,
    }));
    if (String(response.examId) !== scope.examId) throw new ClassInError('forbidden', '测验作答归属不一致。');
    const students = list(response.students);
    sameSet(students.map((s) => String(s.studentId)), scope.studentIds);
    for (const student of students) {
      const records = list(student.markingInfo);
      sameSet(records.map((r) => String(r.topicId)), scope.topics.map((t) => String(t.topicId)));
      for (const record of records) {
        const topic = scope.topics.find((t) => String(t.topicId) === String(record.topicId))!;
        if (record.topicSource !== topic.topicSource || record.topicType !== topic.typeCode) throw new ClassInError('forbidden', '测验作答题源或题型不一致。');
      }
      const questions = scope.topics.map((topic, index) => {
        const record = records.find((r) => String(r.topicId) === String(topic.topicId))!;
        if (![1, 2, 3, 4, 5].includes(topic.typeCode) || ![0, 1, 2].includes(Number(record.isAnswer)) || typeof record.isAnswer !== 'number') throw new ClassInError('schema_error', '逐题状态或题型尚未验证。');
        const status = ['未作答', '已作答', '未参与'][record.isAnswer]!;
        const base = { id: String(topic.topicId), position: index + 1, status, answers: [] as string[], marking: null as string | null, score: null as number | null, hasMedia: false };
        // Unused answer slots exist even before a learner has entered the exam.
        if (record.isAnswer !== 1) return base;
        const answers = typeof record.answer === 'string' ? [record.answer] : record.answer;
        if (!Array.isArray(answers) || answers.some((a) => typeof a !== 'string')) throw new ClassInError('schema_error', '答题内容结构尚未验证。');
        if (answers.some((a: string) => a.trimStart().startsWith('[') || a.trimStart().startsWith('{'))) throw new ClassInError('schema_error', '对象或资源答案尚未验证。');
        const hasMedia = answers.some((a: string) => /<(?:img|video|audio|a)\b|https?:\/\/|data:|blob:/i.test(a));
        const judgments = Array.isArray(record.judgeResult) ? record.judgeResult : record.judgeResult === undefined ? [] : [record.judgeResult];
        if (judgments.some((j) => typeof j !== 'number' || ![0, 1, 2, 3].includes(j))) throw new ClassInError('schema_error', '批阅状态无法核实。');
        const marked = judgments.length > 0 && judgments.every((j) => j !== 0);
        const score = marked && typeof record.score === 'number' && Number.isSafeInteger(record.score) && record.score >= 0 ? record.score / 100 : null;
        return { ...base, answers: hasMedia ? [] : answers.map(text), hasMedia,
          marking: judgments.length ? judgments.map((j) => ['待批阅', '正确', '错误', '部分正确'][j]).join('、') : null, score };
      });
      results.set(String(student.studentId), { status: 'available', message: '已核对当前试卷逐题记录；未参与的空答案和0分占位不是实际成绩。图片等媒体答案尚未解读。', questions });
    }
    return results;
  } catch (error) {
    if (error instanceof ClassInError && error.code === 'forbidden') throw error;
    return new Map(scope.studentIds.map((id) => [id, unavailable()]));
  }
}
